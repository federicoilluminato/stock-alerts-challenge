import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Candle } from '../services/stocks/market';

type Props = {
  data: Candle[];
  width: number;
  height?: number;
};

const CHART_PADDING = 8;
const CANDLE_WIDTH = 6;
const CANDLE_GAP = 2;

export const CandlestickChart = ({ data, width, height = 280 }: Props) => {
  const chartWidth = width - CHART_PADDING * 2;
  const content = useMemo(() => {
    if (!data.length) return null;

    const prices = data.flatMap((d) => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const scaleY = (price: number) => height - CHART_PADDING - ((price - minPrice) / priceRange) * (height - CHART_PADDING * 2);
    const stepX = chartWidth / data.length;

    return data.map((candle, index) => {
      const x = CHART_PADDING + index * stepX + (stepX - CANDLE_WIDTH) / 2;
      const xCenter = CHART_PADDING + index * stepX + stepX / 2;
      const isPositive = candle.close >= candle.open;
      const color = isPositive ? '#22c55e' : '#ef4444';
      const yOpen = scaleY(candle.open);
      const yClose = scaleY(candle.close);
      const yHigh = scaleY(candle.high);
      const yLow = scaleY(candle.low);
      const rectY = Math.min(yOpen, yClose);
      const rectHeight = Math.max(Math.abs(yClose - yOpen), 1);

      return (
        <g key={candle.timestamp}>
          <Line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth={1} />
          <Rect x={x} y={rectY} width={CANDLE_WIDTH} height={rectHeight} fill={color} />
        </g>
      );
    });
  }, [data, chartWidth, height]);

  if (!data.length) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No chart data available</Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <Svg width={width} height={height}>
        {content}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
