import axios from 'axios';
import { env } from '../../config/env.js';

const CACHE_TTL_MS = 60 * 60 * 1000;

type FinnhubStockSymbol = {
  currency: string;
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
};

export type StockListItem = {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
  currency: string;
};

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 15_000,
});

const normalizeStock = (stock: Partial<FinnhubStockSymbol>): StockListItem | null => {
  if (!stock.symbol || !stock.description) {
    return null;
  }

  return {
    symbol: stock.symbol,
    displaySymbol: stock.displaySymbol ?? stock.symbol,
    description: stock.description,
    type: stock.type ?? 'Unknown',
    currency: stock.currency ?? 'USD',
  };
};

class StockCache {
  private data: StockListItem[] | null = null;
  private expiresAt = 0;

  async get(): Promise<StockListItem[]> {
    if (this.data && Date.now() < this.expiresAt) {
      return this.data;
    }

    const response = await finnhubClient.get<Array<Partial<FinnhubStockSymbol>>>('/stock/symbol', {
      params: {
        exchange: 'US',
        token: env.FINNHUB_API_KEY,
        mic: 'XNAS',
      },
    });

    this.data = response.data
      .map(normalizeStock)
      .filter((stock): stock is StockListItem => Boolean(stock))
      .filter((stock) => stock.type.toLowerCase().includes('common'))
      .slice(0, 150);

    this.expiresAt = Date.now() + CACHE_TTL_MS;

    console.info(`Fetched ${this.data.length} stocks from Finnhub (cached for 1h)`);

    return this.data;
  }

  invalidate(): void {
    this.data = null;
    this.expiresAt = 0;
  }
}

export const stockCache = new StockCache();
