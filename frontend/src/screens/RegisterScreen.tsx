import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { useState } from 'react';
import { Button, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { authApi } from '../services/auth/authApi';
import { useAuthStore } from '../state/auth.store';
import { registerForPushNotifications } from '../services/notifications/register';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleRegister = async () => {
    setError(undefined);
    setIsSubmitting(true);

    try {
      const authResponse = await authApi.register({ email, password });
      await setAccessToken(authResponse.accessToken);
      registerForPushNotifications();
      navigation.replace('Home');
    } catch (caughtError) {
      const message = axios.isAxiosError(caughtError)
        ? caughtError.response?.data?.error?.message
        : undefined;

      setError(message ?? 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>Register</Text>
        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={email}
          />
          <View style={styles.passwordField}>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#64748b"
              secureTextEntry={!isPasswordVisible}
              style={styles.passwordInput}
              value={password}
            />
            <Button
              color="#60a5fa"
              title={isPasswordVisible ? 'Hide' : 'Show'}
              onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            color="#60a5fa"
            disabled={isSubmitting}
            title={isSubmitting ? 'Creating account...' : 'Create account'}
            onPress={handleRegister}
          />
          <Button
            color="#60a5fa"
            title="Back to login"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <Image source={require('../assets/designli.png')} style={styles.logo} resizeMode="contain" />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passwordField: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    paddingLeft: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
  },
  error: {
    color: '#f87171',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  logo: {
    height: 72,
    opacity: 0.6,
  },
});
