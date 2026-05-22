import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.content}>
        <Text style={styles.title}>Stock Alerts</Text>
        <View style={styles.actions}>
          <Button color="#60a5fa" title="Stocks" onPress={() => navigation.navigate('Stocks')} />
          <Button color="#60a5fa" title="Alerts" onPress={() => navigation.navigate('Alerts')} />
          <Button color="#f87171" title="Logout" onPress={handleLogout} />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
});
