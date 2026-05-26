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
  const symbols = Object.keys(prices);

  if (symbols.length > 0) {
    console.info('[realtime:socket] broadcasting prices', {
      count: symbols.length,
      prices: Object.fromEntries(Object.entries(prices).map(([symbol, point]) => [symbol, point.price])),
    });
  }

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
      console.info('[realtime:poll] skipped; no subscribed symbols');
      return;
    }

    console.info('[realtime:poll] polling fallback quotes', {
      count: symbols.length,
      symbols,
    });

    hydrateLatestPrices(symbols, { force: true })
      .then(emitPrices)
      .catch((error: unknown) => console.warn('Failed to poll fallback quotes', error));
  }, QUOTE_POLL_INTERVAL_MS);

  console.info('[realtime:poll] fallback quote polling started', {
    intervalMs: QUOTE_POLL_INTERVAL_MS,
    maxSymbols: MAX_QUOTE_POLL_SYMBOLS,
  });
};

export const startRealtimeGateway = (httpServer: http.Server): void => {
  if (io) {
    return;
  }

  io = new Server(httpServer, {
    cors: corsOptions,
  });

  console.info('[realtime:socket] Socket.IO gateway started');

  unsubscribeFinnhubListener = finnhubWebSocketService.onPrice(({ symbol, point }) => {
    console.info('[realtime:finnhub-ws] broadcasting websocket price', {
      symbol,
      price: point.price,
    });
    io?.to(`stock:${symbol}`).emit('stock:price', { symbol, ...point });
  });

  io.on('connection', (socket) => {
    console.info('[realtime:socket] client connected', {
      socketId: socket.id,
    });

    socket.on('stocks:subscribe', async (payload: SubscribePayload) => {
      const symbols = normalizeSymbols(payload?.symbols);

      console.info('[realtime:socket] subscribe request received', {
        socketId: socket.id,
        count: symbols.length,
        symbols,
      });

      if (symbols.length === 0) {
        console.warn('[realtime:socket] subscribe ignored; empty symbols', {
          socketId: socket.id,
        });
        return;
      }

      for (const symbol of symbols) {
        socket.join(`stock:${symbol}`);
      }

      finnhubWebSocketService.subscribe(symbols);

      socket.emit('stocks:snapshot', {
        prices: priceCache.getLatestForSymbols(symbols),
      });

      console.info('[realtime:socket] cache snapshot emitted', {
        socketId: socket.id,
        count: Object.keys(priceCache.getLatestForSymbols(symbols)).length,
      });

      const prices = await hydrateLatestPrices(symbols);

      socket.emit('stocks:snapshot', { prices });

      console.info('[realtime:socket] hydrated snapshot emitted', {
        socketId: socket.id,
        count: Object.keys(prices).length,
      });

      emitPrices(prices);
    });

    socket.on('stock:history:get', (payload: { symbol?: string }) => {
      const [symbol] = normalizeSymbols([payload?.symbol]);

      if (!symbol) {
        console.warn('[realtime:socket] history request ignored; missing symbol', {
          socketId: socket.id,
        });
        return;
      }

      console.info('[realtime:socket] history emitted', {
        socketId: socket.id,
        symbol,
        points: priceCache.getHistory(symbol).length,
      });

      socket.emit('stock:history', {
        symbol,
        history: priceCache.getHistory(symbol),
      });
    });

    socket.on('disconnect', () => {
      console.info('[realtime:socket] client disconnected', {
        socketId: socket.id,
      });
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
