import axios from 'axios';

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
  direction: string
): Promise<void> => {
  const directionText = direction === 'above' ? 'above' : 'below';

  await sendPushNotification({
    to: pushToken,
    title: `Price Alert: ${symbol}`,
    body: `${symbol} is now $${currentPrice.toFixed(2)} (${directionText} your target of $${targetPrice.toFixed(2)})`,
    data: {
      type: 'alert_triggered',
      symbol,
    },
  });
};
