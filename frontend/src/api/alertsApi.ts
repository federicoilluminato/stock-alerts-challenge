import { apiClient } from './client';

export type Alert = {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: string;
  status: string;
  triggeredAt: string | null;
  createdAt: string;
};

export type CreateAlertInput = {
  symbol: string;
  targetPrice: number;
  direction?: 'above' | 'below';
};

export const fetchAlerts = async (): Promise<Alert[]> => {
  const response = await apiClient.get<Alert[]>('/alerts');
  return response.data;
};

export const createAlert = async (input: CreateAlertInput): Promise<Alert> => {
  const response = await apiClient.post<Alert>('/alerts', input);
  return response.data;
};

export const deleteAlert = async (id: string): Promise<void> => {
  await apiClient.delete(`/alerts/${id}`);
};
