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

stocksRouter.get('/search', async (req, res, next) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const stocks = await stockCache.search(query);
    res.json(stocks);
  } catch (error) {
    next(error);
  }
});
