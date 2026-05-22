import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { corsOptions } from '../config/cors.js';

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    console.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

