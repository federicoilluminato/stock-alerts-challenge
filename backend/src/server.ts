import http from 'http';
import { env } from './config/env.js';
import { prisma } from './prisma/client.js';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { startAlertEvaluator, stopAlertEvaluator } from './modules/alerts/evaluator.js';

const app = createApp();
const httpServer = http.createServer(app);

createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.info(`API listening on port ${env.PORT}`);
  startAlertEvaluator();
});

const shutdown = async () => {
  console.info('Shutting down server');
  stopAlertEvaluator();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

