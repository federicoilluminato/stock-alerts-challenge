import type http from 'http';
import { Server } from 'socket.io';
import { corsOptions } from '../../config/cors.js';
import { hydrateLatestPrices } from './finnhub-quote.service.js';
import { finnhubWebSocketService } from './finnhub-websocket.service.js';
import { priceCache } from './price-cache.js';

type SubscribePayload = {
  symbols?: string[];
};

const QUOTE_POLL_INTERVAL_MS = 30_000;
const MAX_QUOTE_POLL_SYMBOLS = 20;

let io: Server | null = null;
let unsubscribeFinnhubListener: (() => void) | null = null;
let quotePollTimer: NodeJS.Timeout | null = null;

const normalizeSymbols = (symbols: unknown): string[] => {
  if (!Array.isArray(symbols)) {
    return [];
  }

  return [...new Set(symbols
    .filter((symbol): symbol is string => typeof symbol === 'string')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean))];
};

const emitPrices = (prices: Record<string, { price: number; timestamp: number }>): void => {
  for (const [symbol, point] of Object.entries(prices)) {
    io?.to(`stock:${symbol}`).emit('stock:price', { symbol, ...point });
  }
};

const startQuotePolling = (): void => {
  if (quotePollTimer) {
    return;
  }

  quotePollTimer = setInterval(() => {
    const symbols = finnhubWebSocketService.getSubscribedSymbols().slice(0, MAX_QUOTE_POLL_SYMBOLS);

    if (symbols.length === 0) {
      return;
    }

    hydrateLatestPrices(symbols, { force: true })
      .then(emitPrices)
      .catch((error: unknown) => console.warn('Failed to poll fallback quotes', error));
  }, QUOTE_POLL_INTERVAL_MS);
};

export const startRealtimeGateway = (httpServer: http.Server): void => {
  if (io) {
    return;
  }

  io = new Server(httpServer, {
    cors: corsOptions,
  });

  unsubscribeFinnhubListener = finnhubWebSocketService.onPrice(({ symbol, point }) => {
    io?.to(`stock:${symbol}`).emit('stock:price', { symbol, ...point });
  });

  io.on('connection', (socket) => {
    console.info(`Socket.IO client connected ${socket.id}`);

    socket.on('stocks:subscribe', async (payload: SubscribePayload) => {
      const symbols = normalizeSymbols(payload?.symbols);

      if (symbols.length === 0) {
        return;
      }

      for (const symbol of symbols) {
        socket.join(`stock:${symbol}`);
      }

      finnhubWebSocketService.subscribe(symbols);

      socket.emit('stocks:snapshot', {
        prices: priceCache.getLatestForSymbols(symbols),
      });

      const prices = await hydrateLatestPrices(symbols);

      socket.emit('stocks:snapshot', { prices });

      emitPrices(prices);
    });

    socket.on('stock:history:get', (payload: { symbol?: string }) => {
      const [symbol] = normalizeSymbols([payload?.symbol]);

      if (!symbol) {
        return;
      }

      socket.emit('stock:history', {
        symbol,
        history: priceCache.getHistory(symbol),
      });
    });

    socket.on('disconnect', () => {
      console.info(`Socket.IO client disconnected ${socket.id}`);
    });
  });

  // Finnhub allows only one WebSocket per API key. Open it lazily on first subscription,
  // not on process boot, to avoid extra connections during Render deploy/cold-start cycles.
  startQuotePolling();
};

export const stopRealtimeGateway = (): void => {
  if (quotePollTimer) {
    clearInterval(quotePollTimer);
    quotePollTimer = null;
  }

  unsubscribeFinnhubListener?.();
  unsubscribeFinnhubListener = null;
  finnhubWebSocketService.stop();
  io?.close();
  io = null;
};
