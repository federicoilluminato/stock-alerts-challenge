import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import { CandlestickChart } from '../components/CandlestickChart';
import type { RootStackParamList } from '../navigation/types';
import { getCandles, getQuote } from '../services/stocks/market';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

export const StockDetailScreen = ({ route, navigation }: Props) => {
  const { symbol, name } = route.params;
  const { width: screenWidth } = useWindowDimensions();

  const candlesQuery = useQuery({
    queryKey: ['candles', symbol],
    queryFn: () => getCandles(symbol),
  });

  const quoteQuery = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => getQuote(symbol),
  });

  const isLoading = candlesQuery.isLoading || quoteQuery.isLoading;
  const isError = candlesQuery.isError || quoteQuery.isError;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centeredState}>
          <ActivityIndicator color="#60a5fa" />
          <Text style={styles.stateText}>Loading chart...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const errorMessage = candlesQuery.error instanceof Error ? candlesQuery.error.message
    : quoteQuery.error instanceof Error ? quoteQuery.error.message
    : 'Failed to load chart data';

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => { candlesQuery.refetch(); quoteQuery.refetch(); }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const quote = quoteQuery.data!;
  const candles = candlesQuery.data ?? [];
  const isPositive = quote.change >= 0;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={styles.currentPrice}>${quote.current.toFixed(2)}</Text>
        <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
        </Text>
      </View>
      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>L {quote.low.toFixed(2)}</Text>
        <Text style={styles.rangeLabel}>O {quote.open.toFixed(2)}</Text>
        <Text style={styles.rangeLabel}>H {quote.high.toFixed(2)}</Text>
      </View>
      {candles.length > 0 ? (
        <CandlestickChart data={candles} width={screenWidth - 48} />
      ) : (
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>No chart data available.</Text>
        </View>
      )}
      <Pressable
        style={styles.alertButton}
        onPress={() => navigation.navigate('CreateAlert', { symbol, name })}
      >
        <Text style={styles.alertButtonText}>Set Alert for {symbol}</Text>
      </Pressable>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  symbol: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  quoteRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  currentPrice: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  change: {
    fontSize: 16,
    fontWeight: '500',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  rangeLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
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
  alertButton: {
    alignItems: 'center',
    backgroundColor: '#3b3f7a',
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 14,
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
