import axios from 'axios';
import { sendFcmNotification } from './firebase-admin.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const expoClient = axios.create({
  baseURL: EXPO_PUSH_URL,
  timeout: 10_000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export const sendPushNotification = async (message: ExpoPushMessage): Promise<void> => {
  try {
    await expoClient.post('/', message);
  } catch (error) {
    console.error('[notifications] Failed to send push notification:', error);
  }
};

export const sendAlertTriggeredNotification = async (
  pushToken: string,
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  platform: string = 'expo',
): Promise<void> => {
  const title = `Price Alert: ${symbol}`;
  const body = `${symbol} hit $${currentPrice.toFixed(2)} (target: $${targetPrice.toFixed(2)})`;
  const data = { type: 'alert_triggered', symbol };

  if (platform === 'fcm') {
    await sendFcmNotification(pushToken, title, body, data);
  } else {
    await sendPushNotification({ to: pushToken, title, body, data });
  }
};
