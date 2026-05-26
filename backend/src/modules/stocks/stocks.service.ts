import axios from 'axios';
import { env } from '../../config/env.js';

const CACHE_TTL_MS = 60 * 60 * 1000;
const DEMO_SYMBOL_PRIORITY = [
  'AAPL',
  'MSFT',
  'NVDA',
  'TSLA',
  'AMZN',
  'META',
  'GOOGL',
  'AMD',
  'NFLX',
  'INTC',
  'PYPL',
  'ADBE',
  'COST',
  'PEP',
  'CSCO',
  'QCOM',
  'AVGO',
  'TXN',
  'SBUX',
  'MU',
];

const DEMO_STOCKS: StockListItem[] = DEMO_SYMBOL_PRIORITY.map((symbol) => ({
  symbol,
  displaySymbol: symbol,
  description: symbol,
  type: 'Common Stock',
  currency: 'USD',
}));

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

const getPriorityIndex = (symbol: string): number => {
  const index = DEMO_SYMBOL_PRIORITY.indexOf(symbol);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

class StockCache {
  private data: StockListItem[] | null = null;
  private expiresAt = 0;

  async get(): Promise<StockListItem[]> {
    if (this.data && Date.now() < this.expiresAt) {
      return this.data;
    }

    let responseData: Array<Partial<FinnhubStockSymbol>>;

    try {
      const response = await finnhubClient.get<Array<Partial<FinnhubStockSymbol>>>('/stock/symbol', {
        params: {
          exchange: 'US',
          token: env.FINNHUB_API_KEY,
          mic: 'XNAS',
        },
      });

      responseData = response.data;
    } catch (error) {
      if (this.data) {
        console.warn('[stocks] Finnhub stock list failed; serving stale cache');
        return this.data;
      }

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      console.warn('[stocks] Finnhub stock list failed; serving demo symbols', { status });
      this.data = DEMO_STOCKS;
      this.expiresAt = Date.now() + CACHE_TTL_MS;
      return this.data;
    }

    this.data = responseData
      .map(normalizeStock)
      .filter((stock): stock is StockListItem => Boolean(stock))
      .filter((stock) => stock.type.toLowerCase().includes('common'))
      .sort((leftStock, rightStock) => {
        const priorityDiff = getPriorityIndex(leftStock.symbol) - getPriorityIndex(rightStock.symbol);
        return priorityDiff === 0 ? leftStock.symbol.localeCompare(rightStock.symbol) : priorityDiff;
      })
      .slice(0, 150);

    this.expiresAt = Date.now() + CACHE_TTL_MS;

    console.info(`Fetched ${this.data.length} stocks from Finnhub (cached for 1h)`);

    return this.data;
  }

  invalidate(): void {
    this.data = null;
    this.expiresAt = 0;
  }

  async search(query: string): Promise<StockListItem[]> {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const stocks = await this.get();

    return stocks.filter((stock) => {
      return stock.symbol.toLowerCase().includes(normalizedQuery)
        || stock.displaySymbol.toLowerCase().includes(normalizedQuery)
        || stock.description.toLowerCase().includes(normalizedQuery);
    });
  }
}

export const stockCache = new StockCache();
