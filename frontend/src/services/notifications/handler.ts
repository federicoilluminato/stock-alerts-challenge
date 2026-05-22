import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const setupNotificationListeners = (): (() => void) => {
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    console.log('[notifications] Notification tapped:', data);
  });

  return () => {
    responseListener.remove();
  };
};
