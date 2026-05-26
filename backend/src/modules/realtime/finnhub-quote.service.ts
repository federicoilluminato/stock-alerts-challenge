import axios from 'axios';
import { env } from '../../config/env.js';
import { priceCache, type PricePoint } from './price-cache.js';

type QuoteResponse = {
  c?: number;
  t?: number;
};

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 10_000,
});

export const hydrateLatestPrices = async (symbols: string[]): Promise<Record<string, PricePoint>> => {
  const missingSymbols = symbols.filter((symbol) => !priceCache.getLatest(symbol));

  const results = await Promise.allSettled(missingSymbols.map(async (symbol) => {
    const response = await finnhubClient.get<QuoteResponse>('/quote', {
      params: {
        symbol,
        token: env.FINNHUB_API_KEY,
      },
    });

    if (!response.data.c || response.data.c <= 0) {
      return null;
    }

    const point = {
      price: response.data.c,
      timestamp: response.data.t ? response.data.t * 1000 : Date.now(),
    };

    priceCache.add(symbol, point);

    return { symbol, point };
  }));

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Failed to hydrate Finnhub quote', result.reason);
    }
  }

  return priceCache.getLatestForSymbols(symbols);
};
