import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiClient } from '../../api/client';

export const registerForPushNotifications = async (): Promise<void> => {
  if (!Device.isDevice) {
    console.log('[notifications] Must use a physical device for push notifications');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#60a5fa',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] Push notification permission not granted');
    return;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('[notifications] Expo push token:', token);

    await apiClient.post('/notifications/tokens', {
      token,
      platform: 'expo',
    });

    console.log('[notifications] Push token registered with backend');
  } catch (error) {
    console.error('[notifications] Failed to register push token:', error);
  }
};
