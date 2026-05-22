import { create } from 'zustand';
import { authStorage } from '../services/auth/authStorage';

type AuthState = {
  accessToken?: string;
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  setAccessToken: (token: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: undefined,
  hasHydrated: false,
  hydrate: async () => {
    const accessToken = await authStorage.getAccessToken();
    set({ accessToken: accessToken ?? undefined, hasHydrated: true });
  },
  setAccessToken: async (accessToken) => {
    await authStorage.setAccessToken(accessToken);
    set({ accessToken });
  },
  clearSession: async () => {
    await authStorage.clearAccessToken();
    set({ accessToken: undefined });
  },
}));

