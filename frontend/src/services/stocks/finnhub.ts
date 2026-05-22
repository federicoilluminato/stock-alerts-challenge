import axios from 'axios';
import { env } from '../../config/env';

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 10_000,
});

export type StockListItem = {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
  currency: string;
};

const normalizeStock = (stock: Partial<StockListItem>): StockListItem | null => {
  if (!stock.symbol || !stock.description) {
    return null;
  }

  return {
    symbol: stock.symbol,
    displaySymbol: stock.displaySymbol ?? stock.symbol,
    description: stock.description,
    type: stock.type ?? 'Unknown',
    currency: stock.currency ?? 'USD',
  };
};

export const listStocks = async (): Promise<StockListItem[]> => {
  if (!env.finnhubApiKey) {
    throw new Error('Missing EXPO_PUBLIC_FINNHUB_API_KEY');
  }

  const response = await finnhubClient.get<Array<Partial<StockListItem>>>('/stock/symbol', {
    params: {
      exchange: 'US',
      token: env.finnhubApiKey,
      mic: 'XNAS',
    },
  });

  return response.data
    .map(normalizeStock)
    .filter((stock): stock is StockListItem => Boolean(stock))
    .filter((stock) => stock.type.toLowerCase().includes('common'))
    .slice(0, 150);
};

type FinnhubSearchItem = {
  description: string;
  displaySymbol: string;
  symbol: string;
  type?: string;
};

type FinnhubSearchResponse = {
  count: number;
  result: FinnhubSearchItem[];
};

export const searchStocks = async (query: string): Promise<StockListItem[]> => {
  if (!env.finnhubApiKey) {
    throw new Error('Missing EXPO_PUBLIC_FINNHUB_API_KEY');
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 1) {
    return [];
  }

  const response = await finnhubClient.get<FinnhubSearchResponse>('/search', {
    params: {
      q: trimmedQuery,
      exchange: 'US',
      token: env.finnhubApiKey,
    },
  });

  return response.data.result
    .filter((item) => Boolean(item.symbol) && Boolean(item.description))
    .map((item) => ({
      symbol: item.symbol,
      displaySymbol: item.displaySymbol || item.symbol,
      description: item.description,
      type: item.type ?? 'Unknown',
      currency: 'USD',
    }))
    .slice(0, 50);
};
