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

export const hydrateLatestPrices = async (symbols: string[], options: { force?: boolean } = {}): Promise<Record<string, PricePoint>> => {
  const symbolsToFetch = options.force ? symbols : symbols.filter((symbol) => !priceCache.getLatest(symbol));

  console.info('[realtime:quotes] hydrate requested', {
    requested: symbols.length,
    fetching: symbolsToFetch.length,
    force: Boolean(options.force),
    symbols: symbolsToFetch,
  });

  const results = await Promise.allSettled(symbolsToFetch.map(async (symbol) => {
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
      timestamp: Date.now(),
    };

    priceCache.add(symbol, point);

    return { symbol, point };
  }));

  let hydratedCount = 0;

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Failed to hydrate Finnhub quote', result.reason);
      continue;
    }

    if (result.value) {
      hydratedCount += 1;
    }
  }

  console.info('[realtime:quotes] hydrate completed', {
    requested: symbols.length,
    fetched: symbolsToFetch.length,
    hydrated: hydratedCount,
  });

  return priceCache.getLatestForSymbols(symbols);
};
