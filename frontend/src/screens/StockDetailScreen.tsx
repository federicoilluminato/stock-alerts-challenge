import { useEffect } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { useRealtimeStore } from '../state/realtime.store';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

export const StockDetailScreen = ({ route, navigation }: Props) => {
  const { symbol, name } = route.params;
  const { width: screenWidth } = useWindowDimensions();
  const normalizedSymbol = symbol.toUpperCase();
  const connected = useRealtimeStore((state) => state.connected);
  const latestPrice = useRealtimeStore((state) => state.latestPrices[normalizedSymbol]);
  const history = useRealtimeStore((state) => state.histories[normalizedSymbol] ?? []);
  const subscribe = useRealtimeStore((state) => state.subscribe);
  const requestHistory = useRealtimeStore((state) => state.requestHistory);

  useEffect(() => {
    subscribe([normalizedSymbol]);
    requestHistory(normalizedSymbol);
  }, [normalizedSymbol, requestHistory, subscribe]);

  const chartPoints = history.length > 0 ? history : latestPrice ? [latestPrice] : [];
  const chartValues = chartPoints.map((point) => point.price);
  const latestChartPrice = latestPrice?.price ?? chartValues.at(-1);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.symbol}>{normalizedSymbol}</Text>
          <Text style={[styles.connectionStatus, connected ? styles.connected : styles.disconnected]}>
            {connected ? 'Live' : 'Offline'}
          </Text>
        </View>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={styles.currentPrice}>{latestChartPrice ? `$${latestChartPrice.toFixed(2)}` : 'Waiting for realtime price'}</Text>
      </View>
      {chartValues.length >= 2 ? (
        <LineChart
          data={{
            labels: chartPoints.map((_, index) => (index % 10 === 0 ? String(index + 1) : '')),
            datasets: [{ data: chartValues }],
          }}
          width={screenWidth - 48}
          height={260}
          chartConfig={{
            backgroundGradientFrom: '#1e204b',
            backgroundGradientTo: '#1e204b',
            color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
            decimalPlaces: 2,
            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
            propsForDots: {
              r: '2',
              strokeWidth: '1',
              stroke: '#60a5fa',
            },
          }}
          bezier
          style={styles.chart}
        />
      ) : (
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>Realtime chart will appear after two ticks.</Text>
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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginBottom: 20,
  },
  currentPrice: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  centeredState: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    minHeight: 260,
  },
  stateText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
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
