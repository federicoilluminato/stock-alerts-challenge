import { Router } from 'express';
import { authRateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import { alertsRouter } from '../modules/alerts/alerts.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { notificationsRouter } from '../modules/notifications/notifications.routes.js';
import { stocksRouter } from '../modules/stocks/stocks.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRateLimitMiddleware, authRouter);
apiRouter.use('/stocks', stocksRouter);
apiRouter.use('/alerts', alertsRouter);
apiRouter.use('/notifications', notificationsRouter);
