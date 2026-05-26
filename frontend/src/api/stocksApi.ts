import { apiClient } from './client';

export type StockListItem = {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
  currency: string;
};

export const getStocks = async (): Promise<StockListItem[]> => {
  const response = await apiClient.get<StockListItem[]>('/stocks');
  return response.data;
};

export const searchStocks = async (query: string): Promise<StockListItem[]> => {
  const response = await apiClient.get<StockListItem[]>('/stocks/search', {
    params: { q: query },
  });

  return response.data;
};

export type StockQuote = {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

export const fetchQuote = async (symbol: string): Promise<StockQuote | null> => {
  try {
    const response = await apiClient.get<StockQuote>(`/stocks/quote/${symbol}`);
    return response.data;
  } catch {
    return null;
  }
};
