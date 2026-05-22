import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AlertsScreen } from '../screens/AlertsScreen';
import { CreateAlertScreen } from '../screens/CreateAlertScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { StocksScreen } from '../screens/StocksScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: 'rgba(14,16,52,1.0)' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} options={({ route }) => ({ title: route.params.symbol })} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="CreateAlert" component={CreateAlertScreen} options={{ title: 'New Alert' }} />
    </Stack.Navigator>
  );
};

