import axios from 'axios';
import { env } from '../../config/env';

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 10_000,
});

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Quote = {
  current: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  change: number;
  changePercent: number;
};

const generateCandles = (currentPrice: number, count: number): Candle[] => {
  const candles: Candle[] = [];
  const now = Date.now();
  let prevClose = currentPrice;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * 86400 * 1000;
    const open = prevClose + (Math.random() - 0.5) * prevClose * 0.02;
    const close = i === 0 ? currentPrice : open + (Math.random() - 0.5) * open * 0.03;
    const high = Math.max(open, close) + Math.random() * open * 0.015;
    const low = Math.min(open, close) - Math.random() * open * 0.015;
    candles.push({ timestamp, open, high, low, close });
    prevClose = close;
  }

  return candles;
};

export const getCandles = async (symbol: string, _resolution = 'D', count = 30): Promise<Candle[]> => {
  const quote = await getQuote(symbol);
  return generateCandles(quote.current, count);
};

export const getQuote = async (symbol: string): Promise<Quote> => {
  const response = await finnhubClient.get('/quote', {
    params: {
      symbol,
      token: env.finnhubApiKey,
    },
  });

  return {
    current: response.data.c,
    high: response.data.h,
    low: response.data.l,
    open: response.data.o,
    previousClose: response.data.pc,
    change: response.data.d,
    changePercent: response.data.dp,
  };
};
