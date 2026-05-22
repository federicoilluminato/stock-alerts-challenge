import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import { getStocks } from '../api/stocksApi';
import { searchStocks, type StockListItem } from '../services/stocks/finnhub';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Stocks'>;

export const StocksScreen = ({ navigation }: Props) => {
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
      <Pressable
        style={styles.stockCard}
        onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol, name: item.description })}
      >
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
    marginBottom: 16,
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
  stockSymbol: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
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
