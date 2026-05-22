import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { authApi } from '../services/auth/authApi';
import { useAuthStore } from '../state/auth.store';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('12345678');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError(undefined);
    setIsSubmitting(true);

    try {
      const authResponse = await authApi.login({ email, password });
      await setAccessToken(authResponse.accessToken);
      navigation.replace('Home');
    } catch (caughtError) {
      const message = axios.isAxiosError(caughtError)
        ? caughtError.response?.data?.error?.message
        : undefined;

      setError(message ?? 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Login</Text>
      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button disabled={isSubmitting} title={isSubmitting ? 'Signing in...' : 'Sign in'} onPress={handleLogin} />
        <Button title="Create account" onPress={() => navigation.navigate('Register')} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: '#b91c1c',
  },
});
