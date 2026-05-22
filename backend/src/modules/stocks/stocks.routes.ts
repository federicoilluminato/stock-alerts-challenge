import { Router } from 'express';
import { stockCache } from './stocks.service.js';

export const stocksRouter = Router();

stocksRouter.get('/', async (_req, res, next) => {
  try {
    const stocks = await stockCache.get();
    res.json(stocks);
  } catch (error) {
    next(error);
  }
});
