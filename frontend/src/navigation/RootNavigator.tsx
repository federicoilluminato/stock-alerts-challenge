import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AlertsScreen } from '../screens/AlertsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { StocksScreen } from '../screens/StocksScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
    </Stack.Navigator>
  );
};

