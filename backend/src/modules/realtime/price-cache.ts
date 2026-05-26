export type PricePoint = {
  price: number;
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
};

const MAX_HISTORY_POINTS = 50;

class PriceCache {
  private latestPrices = new Map<string, PricePoint>();
  private history = new Map<string, PricePoint[]>();

  add(symbol: string, point: PricePoint): void {
    const normalizedSymbol = symbol.toUpperCase();

    this.latestPrices.set(normalizedSymbol, point);

    const points = this.history.get(normalizedSymbol) ?? [];
    points.push(point);

    if (points.length > MAX_HISTORY_POINTS) {
      points.splice(0, points.length - MAX_HISTORY_POINTS);
    }

    this.history.set(normalizedSymbol, points);
  }

  getLatest(symbol: string): PricePoint | null {
    return this.latestPrices.get(symbol.toUpperCase()) ?? null;
  }

  getLatestForSymbols(symbols: string[]): Record<string, PricePoint> {
    return symbols.reduce<Record<string, PricePoint>>((prices, symbol) => {
      const point = this.getLatest(symbol);

      if (point) {
        prices[symbol.toUpperCase()] = point;
      }

      return prices;
    }, {});
  }

  getHistory(symbol: string): PricePoint[] {
    return this.history.get(symbol.toUpperCase()) ?? [];
  }
}

export const priceCache = new PriceCache();
