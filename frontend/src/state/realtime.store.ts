import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { env } from '../config/env';

export type PricePoint = {
  price: number;
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
};

type StockPricePayload = PricePoint & {
  symbol: string;
};

type StocksSnapshotPayload = {
  prices: Record<string, PricePoint>;
};

type StockHistoryPayload = {
  symbol: string;
  history: PricePoint[];
};

type RealtimeState = {
  connected: boolean;
  latestPrices: Record<string, PricePoint>;
  histories: Record<string, PricePoint[]>;
  connect: () => void;
  disconnect: () => void;
  subscribe: (symbols: string[]) => void;
  requestHistory: (symbol: string) => void;
};

let socket: Socket | null = null;

const normalizeSymbols = (symbols: string[]) => {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
};

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  connected: false,
  latestPrices: {},
  histories: {},
  connect: () => {
    if (socket) {
      return;
    }

    socket = io(env.socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('stocks:snapshot', (payload: StocksSnapshotPayload) => {
      set((state) => ({
        latestPrices: {
          ...state.latestPrices,
          ...payload.prices,
        },
      }));
    });

    socket.on('stock:price', (payload: StockPricePayload) => {
      const symbol = payload.symbol.toUpperCase();
      const point = {
        price: payload.price,
        timestamp: payload.timestamp,
        open: payload.open,
        high: payload.high,
        low: payload.low,
        previousClose: payload.previousClose,
        change: payload.change,
        changePercent: payload.changePercent,
      };

      set((state) => {
        const history = [...(state.histories[symbol] ?? []), point].slice(-50);

        return {
          latestPrices: {
            ...state.latestPrices,
            [symbol]: point,
          },
          histories: {
            ...state.histories,
            [symbol]: history,
          },
        };
      });
    });

    socket.on('stock:history', (payload: StockHistoryPayload) => {
      set((state) => ({
        histories: {
          ...state.histories,
          [payload.symbol.toUpperCase()]: payload.history,
        },
      }));
    });
  },
  disconnect: () => {
    socket?.disconnect();
    socket = null;
    set({ connected: false });
  },
  subscribe: (symbols: string[]) => {
    const normalizedSymbols = normalizeSymbols(symbols);

    if (normalizedSymbols.length === 0) {
      return;
    }

    get().connect();
    socket?.emit('stocks:subscribe', { symbols: normalizedSymbols });
  },
  requestHistory: (symbol: string) => {
    const [normalizedSymbol] = normalizeSymbols([symbol]);

    if (!normalizedSymbol) {
      return;
    }

    get().connect();
    socket?.emit('stock:history:get', { symbol: normalizedSymbol });
  },
}));
