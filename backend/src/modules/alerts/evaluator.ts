import axios from 'axios';
import { env } from '../../config/env.js';
import { prisma } from '../../prisma/client.js';
import { sendAlertTriggeredNotification } from '../notifications/notifications.service.js';

type QuoteResponse = {
  c: number;
};

type TriggeredAlert = {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
};

const POLL_INTERVAL_MS = 30_000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 10_000,
});

const getCurrentPrice = async (symbol: string): Promise<number> => {
  const response = await finnhubClient.get<QuoteResponse>('/quote', {
    params: { symbol, token: env.FINNHUB_API_KEY },
  });
  return response.data.c;
};

export const evaluateAlerts = async (): Promise<TriggeredAlert[]> => {
  const triggered: TriggeredAlert[] = [];

  try {
    const activeAlerts = await prisma.alert.findMany({ where: { status: 'active' } });
    if (activeAlerts.length === 0) return triggered;

    const uniqueSymbols = [...new Set(activeAlerts.map((a) => a.symbol))];
    const prices = new Map<string, number>();

    for (const symbol of uniqueSymbols) {
      try {
        const price = await getCurrentPrice(symbol);
        prices.set(symbol, price);
      } catch {
        console.warn(`[evaluator] Failed to fetch price for ${symbol}`);
      }
    }

    for (const alert of activeAlerts) {
      const currentPrice = prices.get(alert.symbol);
      if (currentPrice === undefined) continue;

      const shouldTrigger = currentPrice >= alert.targetPrice;

      if (shouldTrigger) {
        console.info(`[evaluator] Alert ${alert.id} triggered: ${alert.symbol} at $${currentPrice} (target: $${alert.targetPrice})`);

        await prisma.alert.update({
          where: { id: alert.id },
          data: { status: 'triggered', triggeredAt: new Date() },
        });

        triggered.push({ id: alert.id, symbol: alert.symbol, targetPrice: alert.targetPrice, currentPrice });

        const tokens = await prisma.pushToken.findMany({
          where: { userId: alert.userId },
        });

        for (const t of tokens) {
          await sendAlertTriggeredNotification(t.token, alert.symbol, currentPrice, alert.targetPrice, t.platform);
        }
      }
    }
  } catch (error) {
    console.error('[evaluator] Error evaluating alerts:', error);
  }

  return triggered;
};

export const startAlertEvaluator = (): void => {
  if (intervalHandle) return;

  console.info('[evaluator] Starting alert evaluator (polling every 60s)');
  evaluateAlerts();
  intervalHandle = setInterval(evaluateAlerts, POLL_INTERVAL_MS);
};

export const stopAlertEvaluator = (): void => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.info('[evaluator] Stopped alert evaluator');
  }
};
