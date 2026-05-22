import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, StyleSheet, Text } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../state/auth.store';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: Props) => {
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Home</Text>
      <Button title="Stocks" onPress={() => navigation.navigate('Stocks')} />
      <Button title="Alerts" onPress={() => navigation.navigate('Alerts')} />
      <Button title="Logout" onPress={handleLogout} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
  },
});
