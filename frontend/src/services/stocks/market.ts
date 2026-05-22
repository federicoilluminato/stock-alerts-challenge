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

type FinnhubCandleResponse = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: string;
  t: number[];
  v: number[];
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

const toCandles = (response: FinnhubCandleResponse): Candle[] => {
  if (response.s === 'no_data') {
    return [];
  }

  return response.t.map((timestamp, index) => ({
    timestamp: timestamp * 1000,
    open: response.o[index],
    high: response.h[index],
    low: response.l[index],
    close: response.c[index],
  }));
};

export const getCandles = async (symbol: string, resolution = 'D', count = 30): Promise<Candle[]> => {
  const to = Math.floor(Date.now() / 1000);
  const from = to - count * 86400;

  const response = await finnhubClient.get<FinnhubCandleResponse>('/stock/candle', {
    params: {
      symbol,
      resolution,
      from,
      to,
      token: env.finnhubApiKey,
    },
  });

  return toCandles(response.data);
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
