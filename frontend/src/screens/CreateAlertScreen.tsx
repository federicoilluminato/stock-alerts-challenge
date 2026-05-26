import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { createAlert } from '../api/alertsApi';
import { searchStocks } from '../api/stocksApi';
import { useRealtimeStore } from '../state/realtime.store';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlert'>;

export const CreateAlertScreen = ({ route, navigation }: Props) => {
  const defaultSymbol = route.params?.symbol ?? '';
  const queryClient = useQueryClient();

  const [query, setQuery] = useState(defaultSymbol);
  const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol);
  const [selectedName, setSelectedName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const latestPrices = useRealtimeStore((state) => state.latestPrices);
  const subscribe = useRealtimeStore((state) => state.subscribe);

  const searchQuery = useQuery({
    queryKey: ['stockSearch', query],
    queryFn: () => searchStocks(query),
    enabled: query.length >= 1 && query !== selectedSymbol,
  });

  useEffect(() => {
    if (selectedSymbol.length > 0) {
      subscribe([selectedSymbol]);
    }
  }, [selectedSymbol, subscribe]);

  const mutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      navigation.goBack();
    },
  });

  const handleSelectStock = (symbol: string, name: string) => {
    setSelectedSymbol(symbol);
    setSelectedName(name);
    setQuery(symbol);
    setTargetPrice('');
  };

  const handleSubmit = () => {
    const price = parseFloat(targetPrice);
    if (!selectedSymbol.trim()) return;
    if (isNaN(price) || price <= 0) return;
    mutation.mutate({ symbol: selectedSymbol.trim().toUpperCase(), targetPrice: price });
  };

  const currentPrice = latestPrices[selectedSymbol.toUpperCase()]?.price;

  return (
    <ScreenContainer>
      <Text style={styles.label}>Symbol</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={(text) => {
          setQuery(text.toUpperCase());
          if (text !== selectedSymbol) {
            setSelectedSymbol('');
            setSelectedName('');
          }
        }}
        placeholder="Search stocks..."
        placeholderTextColor="#64748b"
        autoCapitalize="characters"
      />

      {searchQuery.data && searchQuery.data.length > 0 && query !== selectedSymbol && (
        <FlatList
          data={searchQuery.data}
          keyExtractor={(item) => item.symbol}
          style={styles.searchResults}
          renderItem={({ item }) => (
            <Pressable style={styles.searchItem} onPress={() => handleSelectStock(item.symbol, item.description)}>
              <Text style={styles.searchSymbol}>{item.symbol}</Text>
              <Text style={styles.searchName} numberOfLines={1}>{item.description}</Text>
            </Pressable>
          )}
        />
      )}

      {selectedSymbol.length > 0 && (
        <View style={styles.priceContainer}>
          <Text style={styles.selectedSymbol}>{selectedSymbol}</Text>
          {selectedName.length > 0 && <Text style={styles.selectedName} numberOfLines={1}>{selectedName}</Text>}
          {currentPrice !== undefined ? (
            <Text style={styles.currentPrice}>${currentPrice.toFixed(2)}</Text>
          ) : (
            <Text style={styles.waitingPrice}>Waiting for tick</Text>
          )}
        </View>
      )}

      <Text style={styles.label}>Target Price</Text>
      <TextInput
        style={styles.input}
        value={targetPrice}
        onChangeText={setTargetPrice}
        placeholder="e.g. 250.00"
        placeholderTextColor="#64748b"
        keyboardType="decimal-pad"
      />

      <Pressable
        style={[styles.submitButton, mutation.isPending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending || !selectedSymbol}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitText}>Create Alert</Text>
        )}
      </Pressable>

      {mutation.isError && (
        <Text style={styles.errorText}>
          {axios.isAxiosError(mutation.error)
            ? mutation.error.response?.data?.error?.message ?? 'Failed to create alert. Try again.'
            : 'Failed to create alert. Try again.'}
        </Text>
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
  searchResults: {
    backgroundColor: 'rgba(30,32,80,0.95)',
    borderColor: '#3b3f7a',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 180,
  },
  searchItem: {
    borderBottomColor: '#3b3f7a',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchSymbol: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchName: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,32,80,0.6)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedSymbol: {
    color: '#60a5fa',
    fontSize: 18,
    fontWeight: '700',
  },
  selectedName: {
    color: '#94a3b8',
    flex: 1,
    fontSize: 13,
  },
  currentPrice: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingPrice: {
    color: '#64748b',
    fontSize: 12,
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
