import { io, Socket } from 'socket.io-client';
import { env } from '../../config/env';
import { useAuthStore } from '../../state/auth.store';

let socket: Socket | undefined;

export const getSocket = () => {
  if (!socket) {
    socket = io(env.socketUrl, {
      autoConnect: false,
      auth: () => ({
        token: useAuthStore.getState().accessToken,
      }),
    });
  }

  return socket;
};

export const connectSocket = () => {
  const client = getSocket();

  if (!client.connected) {
    client.connect();
  }

  return client;
};

export const disconnectSocket = () => {
  socket?.disconnect();
};

