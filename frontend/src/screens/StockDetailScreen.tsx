import { useEffect, useState } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { useRealtimeStore } from '../state/realtime.store';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

const EMPTY_HISTORY: [] = [];
const POLL_INTERVAL_SECONDS = 60;

const formatOptionalPrice = (value: number | undefined) => {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '-';
};

export const StockDetailScreen = ({ route, navigation }: Props) => {
  const { symbol, name } = route.params;
  const { width: screenWidth } = useWindowDimensions();
  const normalizedSymbol = symbol.toUpperCase();
  const connected = useRealtimeStore((state) => state.connected);
  const latestPrice = useRealtimeStore((state) => state.latestPrices[normalizedSymbol]);
  const history = useRealtimeStore((state) => state.histories[normalizedSymbol] ?? EMPTY_HISTORY);
  const subscribe = useRealtimeStore((state) => state.subscribe);
  const requestHistory = useRealtimeStore((state) => state.requestHistory);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    subscribe([normalizedSymbol]);
    requestHistory(normalizedSymbol);
  }, [normalizedSymbol, requestHistory, subscribe]);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const chartPoints = history.length > 0 ? history : latestPrice ? [latestPrice] : [];
  const chartValues = chartPoints.map((point) => point.price);
  const hasFlatChart = chartValues.length >= 2 && chartValues.every((value) => value === chartValues[0]);
  const displayChartValues = hasFlatChart
    ? chartValues.map((value, index) => (index === 0 ? value * 0.999 : value))
    : chartValues;
  const latestChartPrice = latestPrice?.price ?? chartValues.at(-1);
  const secondsSinceLastTick = latestPrice ? Math.floor((now - latestPrice.timestamp) / 1000) : 0;
  const secondsUntilNextTick = latestPrice ? Math.max(POLL_INTERVAL_SECONDS - (secondsSinceLastTick % POLL_INTERVAL_SECONDS), 0) : POLL_INTERVAL_SECONDS;
  const change = latestPrice?.change;
  const changePercent = latestPrice?.changePercent;
  const isPositive = typeof change === 'number' ? change >= 0 : true;

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
        {typeof change === 'number' && typeof changePercent === 'number' ? (
          <Text style={[styles.changeText, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </Text>
        ) : null}
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Open</Text>
          <Text style={styles.statValue}>{formatOptionalPrice(latestPrice?.open)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>High</Text>
          <Text style={styles.statValue}>{formatOptionalPrice(latestPrice?.high)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low</Text>
          <Text style={styles.statValue}>{formatOptionalPrice(latestPrice?.low)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Prev Close</Text>
          <Text style={styles.statValue}>{formatOptionalPrice(latestPrice?.previousClose)}</Text>
        </View>
      </View>
      <Text style={styles.chartMeta}>
        {chartValues.length} realtime point{chartValues.length === 1 ? '' : 's'} received
        {hasFlatChart ? ' - market price unchanged' : ''} · next tick in {secondsUntilNextTick}s
      </Text>
      {chartValues.length >= 2 ? (
        <LineChart
          data={{
            labels: chartPoints.map((_, index) => (index % 10 === 0 ? String(index + 1) : '')),
            datasets: [{ data: displayChartValues }],
          }}
          width={screenWidth - 48}
          height={260}
          chartConfig={{
            backgroundGradientFrom: '#1e204b',
            backgroundGradientTo: '#1e204b',
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            decimalPlaces: 2,
            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
            propsForDots: {
              r: '2',
              strokeWidth: '1',
              stroke: '#22c55e',
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
    marginBottom: 12,
  },
  currentPrice: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  changeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#1e204b',
    borderColor: '#3b3f7a',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '47%',
    padding: 10,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  chartMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
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
