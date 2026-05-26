import type http from 'http';
import { Server } from 'socket.io';
import { corsOptions } from '../../config/cors.js';
import { hydrateLatestPrices } from './finnhub-quote.service.js';
import { finnhubWebSocketService } from './finnhub-websocket.service.js';
import { priceCache } from './price-cache.js';

type SubscribePayload = {
  symbols?: string[];
};

let io: Server | null = null;
let unsubscribeFinnhubListener: (() => void) | null = null;

const normalizeSymbols = (symbols: unknown): string[] => {
  if (!Array.isArray(symbols)) {
    return [];
  }

  return [...new Set(symbols
    .filter((symbol): symbol is string => typeof symbol === 'string')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean))];
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

      for (const [symbol, point] of Object.entries(prices)) {
        io?.to(`stock:${symbol}`).emit('stock:price', { symbol, ...point });
      }
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

  finnhubWebSocketService.start();
};

export const stopRealtimeGateway = (): void => {
  unsubscribeFinnhubListener?.();
  unsubscribeFinnhubListener = null;
  finnhubWebSocketService.stop();
  io?.close();
  io = null;
};
