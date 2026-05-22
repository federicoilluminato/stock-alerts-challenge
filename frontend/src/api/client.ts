import axios from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '../state/auth.store';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

