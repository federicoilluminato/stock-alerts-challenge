import { prisma } from '../../prisma/client.js';
import { AppError } from '../../middlewares/error.middleware.js';

export type AlertData = {
  id: string;
  symbol: string;
  targetPrice: number;
  status: string;
  triggeredAt: string | null;
  createdAt: string;
};

const toAlertData = (alert: {
  id: string;
  symbol: string;
  targetPrice: number;
  status: string;
  triggeredAt: Date | null;
  createdAt: Date;
}): AlertData => ({
  id: alert.id,
  symbol: alert.symbol,
  targetPrice: alert.targetPrice,
  status: alert.status,
  triggeredAt: alert.triggeredAt?.toISOString() ?? null,
  createdAt: alert.createdAt.toISOString(),
});

export const listAlerts = async (userId: string): Promise<AlertData[]> => {
  const alerts = await prisma.alert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return alerts.map(toAlertData);
};

export const createAlert = async (
  userId: string,
  data: { symbol: string; targetPrice: number }
): Promise<AlertData> => {
  const alert = await prisma.alert.create({
    data: {
      userId,
      symbol: data.symbol.toUpperCase(),
      targetPrice: data.targetPrice,
    },
  });

  return toAlertData(alert);
};

export const deleteAlert = async (userId: string, alertId: string): Promise<void> => {
  const alert = await prisma.alert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) {
    throw new AppError(404, 'Alert not found');
  }

  await prisma.alert.delete({ where: { id: alertId } });
};

export const getAlertsForSymbol = async (symbol: string): Promise<AlertData[]> => {
  const alerts = await prisma.alert.findMany({
    where: { symbol, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  return alerts.map(toAlertData);
};
