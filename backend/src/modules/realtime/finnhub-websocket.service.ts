import WebSocket from 'ws';
import { env } from '../../config/env.js';
import { priceCache, type PricePoint } from './price-cache.js';

type FinnhubTrade = {
  s: string;
  p: number;
  t: number;
};

type FinnhubMessage = {
  type?: string;
  data?: FinnhubTrade[];
};

type PriceListener = (payload: { symbol: string; point: PricePoint }) => void;

const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

class FinnhubWebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private stopped = true;
  private subscribedSymbols = new Set<string>();
  private listeners = new Set<PriceListener>();

  start(): void {
    if (this.socket || !this.stopped) {
      return;
    }

    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  onPrice(listener: PriceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribe(symbols: string[]): void {
    const newSymbols = symbols
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .filter((symbol) => !this.subscribedSymbols.has(symbol));

    for (const symbol of newSymbols) {
      this.subscribedSymbols.add(symbol);
      this.send({ type: 'subscribe', symbol });
    }
  }

  getSubscribedSymbols(): string[] {
    return [...this.subscribedSymbols];
  }

  private connect(): void {
    console.info('Connecting to Finnhub WebSocket');
    this.socket = new WebSocket(FINNHUB_WS_URL);

    this.socket.on('open', () => {
      console.info('Finnhub WebSocket connected');
      this.reconnectAttempt = 0;

      for (const symbol of this.subscribedSymbols) {
        this.send({ type: 'subscribe', symbol });
      }
    });

    this.socket.on('message', (rawMessage) => {
      this.handleMessage(rawMessage.toString());
    });

    this.socket.on('error', (error) => {
      console.error('Finnhub WebSocket error', error);
    });

    this.socket.on('close', () => {
      console.warn('Finnhub WebSocket closed');
      this.socket = null;
      this.scheduleReconnect();
    });
  }

  private handleMessage(rawMessage: string): void {
    let message: FinnhubMessage;

    try {
      message = JSON.parse(rawMessage) as FinnhubMessage;
    } catch {
      return;
    }

    if (message.type !== 'trade' || !Array.isArray(message.data)) {
      return;
    }

    for (const trade of message.data) {
      if (!trade.s || typeof trade.p !== 'number') {
        continue;
      }

      const symbol = trade.s.toUpperCase();
      const point = {
        price: trade.p,
        timestamp: trade.t || Date.now(),
      };

      priceCache.add(symbol, point);

      for (const listener of this.listeners) {
        listener({ symbol, point });
      }
    }
  }

  private send(payload: { type: 'subscribe' | 'unsubscribe'; symbol: string }): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_DELAY_MS);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export const finnhubWebSocketService = new FinnhubWebSocketService();
