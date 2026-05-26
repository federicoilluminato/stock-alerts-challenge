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
