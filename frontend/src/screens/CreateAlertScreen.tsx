import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { createAlert } from '../api/alertsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlert'>;

export const CreateAlertScreen = ({ route, navigation }: Props) => {
  const defaultSymbol = route.params?.symbol ?? '';
  const queryClient = useQueryClient();

  const [symbol, setSymbol] = useState(defaultSymbol);
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  const mutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      navigation.goBack();
    },
  });

  const handleSubmit = () => {
    const price = parseFloat(targetPrice);
    if (!symbol.trim()) return;
    if (isNaN(price) || price <= 0) return;
    mutation.mutate({ symbol: symbol.trim().toUpperCase(), targetPrice: price, direction });
  };

  return (
    <ScreenContainer>
      <Text style={styles.label}>Symbol</Text>
      <TextInput
        style={styles.input}
        value={symbol}
        onChangeText={setSymbol}
        placeholder="e.g. AAPL"
        placeholderTextColor="#64748b"
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Target Price</Text>
      <TextInput
        style={styles.input}
        value={targetPrice}
        onChangeText={setTargetPrice}
        placeholder="e.g. 250.00"
        placeholderTextColor="#64748b"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Direction</Text>
      <View style={styles.directionRow}>
        <Pressable
          style={[styles.directionButton, direction === 'above' && styles.directionActive]}
          onPress={() => setDirection('above')}
        >
          <Text style={[styles.directionText, direction === 'above' && styles.directionTextActive]}>Above</Text>
        </Pressable>
        <Pressable
          style={[styles.directionButton, direction === 'below' && styles.directionActive]}
          onPress={() => setDirection('below')}
        >
          <Text style={[styles.directionText, direction === 'below' && styles.directionTextActive]}>Below</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.submitButton, mutation.isPending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitText}>Create Alert</Text>
        )}
      </Pressable>

      {mutation.isError && (
        <Text style={styles.errorText}>Failed to create alert. Try again.</Text>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  label: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(30,32,80,0.6)',
    borderColor: '#3b3f7a',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionButton: {
    borderColor: '#3b3f7a',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  directionActive: {
    backgroundColor: 'rgba(96,165,250,0.2)',
    borderColor: '#60a5fa',
  },
  directionText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  directionTextActive: {
    color: '#60a5fa',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#3b3f7a',
    borderRadius: 8,
    marginTop: 28,
    paddingVertical: 14,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    marginTop: 12,
    textAlign: 'center',
  },
});
