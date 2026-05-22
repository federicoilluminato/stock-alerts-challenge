import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { getStocks } from '../api/stocksApi';
import { searchStocks, type StockListItem } from '../services/stocks/finnhub';

export const StocksScreen = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  const renderStockItem = ({ item }: { item: StockListItem }) => {
    return (
      <Pressable style={styles.stockCard}>
        <Text style={styles.stockSymbol}>{item.symbol}</Text>
        <Text style={styles.stockName}>{item.description}</Text>
        <Text style={styles.stockMeta}>
          {item.displaySymbol} · {item.currency}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Stocks</Text>
      <TextInput
        autoCapitalize="characters"
        onChangeText={setSearch}
        placeholder="Type a symbol or company name (AAPL, Apple...)"
        style={styles.searchInput}
        value={search}
      />
      {!isSearching ? null : null}
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator />
          <Text>{isSearching ? 'Searching stocks...' : 'Loading stocks...'}</Text>
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
          ListEmptyComponent={<Text>{isSearching ? 'No stocks found.' : 'No stocks available.'}</Text>}
        />
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
  },
  searchInput: {
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 8,
  },
  centeredState: {
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  errorText: {
    color: '#b91c1c',
  },
  retryButton: {
    backgroundColor: '#0f172a',
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
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 6,
    borderWidth: 1,
    padding: 12,
  },
  stockSymbol: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  stockName: {
    color: '#1e293b',
    fontSize: 14,
    marginTop: 2,
  },
  stockMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
});
