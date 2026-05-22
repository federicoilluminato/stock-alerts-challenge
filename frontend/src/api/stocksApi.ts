import { apiClient } from './client';
import type { StockListItem } from '../services/stocks/finnhub';

export const getStocks = async (): Promise<StockListItem[]> => {
  const response = await apiClient.get<StockListItem[]>('/stocks');
  return response.data;
};
