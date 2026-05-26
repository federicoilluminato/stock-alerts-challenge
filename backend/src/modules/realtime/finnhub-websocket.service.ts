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
const RATE_LIMIT_RECONNECT_DELAY_MS = 5 * 60 * 1000;

class FinnhubWebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private stopped = true;
  private connecting = false;
  private rateLimitedUntil = 0;
  private subscribedSymbols = new Set<string>();
  private listeners = new Set<PriceListener>();

  start(): void {
    if (this.socket || this.connecting || !this.stopped) {
      return;
    }

    this.stopped = false;
    this.connectOrWaitForRateLimit();
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

    if (this.subscribedSymbols.size > 0) {
      this.start();
    }
  }

  getSubscribedSymbols(): string[] {
    return [...this.subscribedSymbols];
  }

  private connect(): void {
    if (this.connecting || this.socket) {
      return;
    }

    this.connecting = true;
    console.info('Connecting to Finnhub WebSocket');
    this.socket = new WebSocket(FINNHUB_WS_URL);

    this.socket.on('unexpected-response', (_request, response) => {
      if (response.statusCode === 429) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_RECONNECT_DELAY_MS;
        console.warn('Finnhub WebSocket rate limited; delaying reconnect for 5 minutes');
      }
    });

    this.socket.on('open', () => {
      console.info('Finnhub WebSocket connected');
      this.connecting = false;
      this.reconnectAttempt = 0;
      this.rateLimitedUntil = 0;

      for (const symbol of this.subscribedSymbols) {
        this.send({ type: 'subscribe', symbol });
      }
    });

    this.socket.on('message', (rawMessage) => {
      this.handleMessage(rawMessage.toString());
    });

    this.socket.on('error', (error) => {
      if (error.message.includes('429')) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_RECONNECT_DELAY_MS;
      }

      console.error('Finnhub WebSocket error', error);
    });

    this.socket.on('close', () => {
      console.warn('Finnhub WebSocket closed');
      this.connecting = false;
      this.socket = null;
      this.scheduleReconnect();
    });
  }

  private connectOrWaitForRateLimit(): void {
    const now = Date.now();

    if (this.rateLimitedUntil > now) {
      this.scheduleReconnect(this.rateLimitedUntil - now);
      return;
    }

    this.connect();
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

  private scheduleReconnect(forcedDelay?: number): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    const delay = forcedDelay ?? Math.min(RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_DELAY_MS);

    if (!forcedDelay) {
      this.reconnectAttempt += 1;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectOrWaitForRateLimit();
    }, delay);
  }
}

export const finnhubWebSocketService = new FinnhubWebSocketService();
