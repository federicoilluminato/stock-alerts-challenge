import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiClient } from '../../api/client';

const isExpoGo = Constants.appOwnership === 'expo';

const registerExpoPushToken = async (): Promise<void> => {
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('[notifications] Expo push token:', token);

  await apiClient.post('/notifications/tokens', {
    token,
    platform: 'expo',
  });

  console.log('[notifications] Push token registered with backend');
};

const registerFcmToken = async (): Promise<void> => {
  try {
    const { messaging } = await import('@react-native-firebase/messaging');
    const fcmToken = await messaging().getToken();
    console.log('[notifications] FCM token:', fcmToken);

    await apiClient.post('/notifications/tokens', {
      token: fcmToken,
      platform: 'fcm',
    });

    console.log('[notifications] FCM token registered with backend');
  } catch (error) {
    console.error('[notifications] Failed to register FCM token:', error);
  }
};

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

  if (isExpoGo) {
    await registerExpoPushToken();
  } else {
    await registerFcmToken();
  }
};
