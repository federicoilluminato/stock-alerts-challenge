export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/api\/?$/, ''),
};
