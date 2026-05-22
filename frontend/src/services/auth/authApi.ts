import { apiClient } from '../../api/client';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

type AuthCredentials = {
  email: string;
  password: string;
};

export const authApi = {
  login: async (credentials: AuthCredentials) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },
  register: async (credentials: AuthCredentials) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },
  me: async () => {
    const response = await apiClient.get<{ user: AuthUser }>('/auth/me');
    return response.data.user;
  },
};
