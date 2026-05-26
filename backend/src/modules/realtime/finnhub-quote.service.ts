import axios from 'axios';
import { env } from '../../config/env.js';
import { priceCache, type PricePoint } from './price-cache.js';

type QuoteResponse = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type HydrateResult = {
  symbol: string;
  point: PricePoint;
} | null;

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 10_000,
});

const getErrorSummary = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return { message: error instanceof Error ? error.message : 'Unknown error' };
  }

  return {
    message: error.message,
    status: error.response?.status,
    remaining: error.response?.headers['x-ratelimit-remaining'],
    reset: error.response?.headers['x-ratelimit-reset'],
  };
};

export const hydrateLatestPrices = async (symbols: string[], options: { force?: boolean } = {}): Promise<Record<string, PricePoint>> => {
  const symbolsToFetch = options.force ? symbols : symbols.filter((symbol) => !priceCache.getLatest(symbol));

  console.info('[realtime:quotes] hydrate requested', {
    requested: symbols.length,
    fetching: symbolsToFetch.length,
    force: Boolean(options.force),
    symbols: symbolsToFetch,
  });

  const results: HydrateResult[] = [];

  for (const symbol of symbolsToFetch) {
    try {
      const response = await finnhubClient.get<QuoteResponse>('/quote', {
        params: {
          symbol,
          token: env.FINNHUB_API_KEY,
        },
      });

      if (!response.data.c || response.data.c <= 0) {
        results.push(null);
        continue;
      }

      const point = {
        price: response.data.c,
        timestamp: Date.now(),
        open: response.data.o,
        high: response.data.h,
        low: response.data.l,
        previousClose: response.data.pc,
        change: response.data.d,
        changePercent: response.data.dp,
      };

      priceCache.add(symbol, point);
      results.push({ symbol, point });
    } catch (error) {
      console.warn('[realtime:quotes] quote fetch failed', {
        symbol,
        ...getErrorSummary(error),
      });

      if (axios.isAxiosError(error) && error.response?.status === 429) {
        break;
      }
    }
  }

  const hydratedCount = results.filter(Boolean).length;

  console.info('[realtime:quotes] hydrate completed', {
    requested: symbols.length,
    fetched: symbolsToFetch.length,
    hydrated: hydratedCount,
  });

  return priceCache.getLatestForSymbols(symbols);
};
