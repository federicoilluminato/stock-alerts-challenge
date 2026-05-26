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

stocksRouter.get('/quote/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol?.trim().toUpperCase();

    if (!symbol) {
      res.status(400).json({ error: { message: 'Symbol is required' } });
      return;
    }

    const quote = await stockCache.getQuote(symbol);

    if (!quote) {
      res.status(404).json({ error: { message: `No quote data for ${symbol}` } });
      return;
    }

    res.json(quote);
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
