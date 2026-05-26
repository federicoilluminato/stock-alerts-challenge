import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import { getStocks, searchStocks, type StockListItem } from '../api/stocksApi';
import type { RootStackParamList } from '../navigation/types';
import { useRealtimeStore } from '../state/realtime.store';

type Props = NativeStackScreenProps<RootStackParamList, 'Stocks'>;

export const StocksScreen = ({ navigation }: Props) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const connected = useRealtimeStore((state) => state.connected);
  const latestPrices = useRealtimeStore((state) => state.latestPrices);
  const subscribe = useRealtimeStore((state) => state.subscribe);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const stocksQuery = useQuery({
    queryKey: ['stocks'],
    queryFn: getStocks,
    staleTime: 60 * 60 * 1000,
  });

  const searchQuery = useQuery({
    queryKey: ['stocks', 'search', debouncedSearch],
    queryFn: () => searchStocks(debouncedSearch),
    enabled: debouncedSearch.trim().length >= 1,
  });

  const isSearching = debouncedSearch.trim().length >= 1;
  const stocks = isSearching ? (searchQuery.data ?? []) : (stocksQuery.data ?? []);
  const isLoading = isSearching ? searchQuery.isLoading : stocksQuery.isLoading;
  const isError = isSearching ? searchQuery.isError : stocksQuery.isError;
  const refetch = isSearching ? searchQuery.refetch : stocksQuery.refetch;

  useEffect(() => {
    if (stocks.length === 0) {
      return;
    }

    subscribe(stocks.slice(0, 5).map((stock) => stock.symbol));
  }, [stocks, subscribe]);

  const renderStockItem = ({ item }: { item: StockListItem }) => {
    const latestPrice = latestPrices[item.symbol]?.price;

    return (
      <Pressable
        style={styles.stockCard}
        onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol, name: item.description })}
      >
        <View style={styles.stockHeaderRow}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={latestPrice ? styles.stockPrice : styles.waitingPrice}>
            {latestPrice ? `$${latestPrice.toFixed(2)}` : 'Waiting for tick'}
          </Text>
        </View>
        <Text style={styles.stockName}>{item.description}</Text>
        <Text style={styles.stockMeta}>
          {item.displaySymbol} · {item.currency}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Stocks</Text>
        <Text style={[styles.connectionStatus, connected ? styles.connected : styles.disconnected]}>
          {connected ? 'Live' : 'Offline'}
        </Text>
      </View>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setSearch}
          placeholder="Search stocks..."
          placeholderTextColor="#64748b"
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} style={styles.clearButton}>
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color="#60a5fa" />
          <Text style={styles.stateText}>{isSearching ? 'Searching stocks...' : 'Loading stocks...'}</Text>
        </View>
      ) : null}
      {isError ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>Failed to load stocks.</Text>
          <Pressable style={styles.retryButton} onPress={() => void refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!isLoading && !isError ? (
        <FlatList
          data={stocks}
          keyExtractor={(item) => item.symbol}
          renderItem={renderStockItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.stateText}>{isSearching ? 'No stocks found.' : 'No stocks available.'}</Text>}
        />
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  connectionStatus: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  connected: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    color: '#22c55e',
  },
  disconnected: {
    backgroundColor: 'rgba(248,113,113,0.16)',
    color: '#f87171',
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#1e204b',
    borderColor: '#3b3f7a',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    color: '#ffffff',
    flex: 1,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  centeredState: {
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  stateText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
  },
  retryButton: {
    backgroundColor: '#3b3f7a',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  stockCard: {
    backgroundColor: '#1e204b',
    borderColor: '#3b3f7a',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  stockHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockSymbol: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
  },
  stockPrice: {
    color: '#22c55e',
    fontSize: 15,
    fontWeight: '700',
  },
  waitingPrice: {
    color: '#64748b',
    fontSize: 12,
  },
  stockName: {
    color: '#e2e8f0',
    fontSize: 14,
    marginTop: 2,
  },
  stockMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
