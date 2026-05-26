import cors from 'cors';
import express from 'express';
import { corsOptions } from './config/cors.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { apiRateLimitMiddleware } from './middlewares/rate-limit.middleware.js';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware.js';
import { apiRouter } from './routes/index.js';

export const createApp = () => {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(requestLoggerMiddleware);
  app.use('/api', apiRateLimitMiddleware);

  app.use('/api', apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
