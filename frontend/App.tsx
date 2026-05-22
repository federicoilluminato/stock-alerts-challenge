import { useEffect } from 'react';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { setupNotificationListeners } from './src/services/notifications/handler';

export default function App() {
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
