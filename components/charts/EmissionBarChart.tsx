import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { colors, spacing, typography } from '@/lib/theme';

export interface BarChartDataItem {
  label: string;
  value: number;
  color: string;
}

interface EmissionBarChartProps {
  data: BarChartDataItem[];
  width: number;
  height?: number;
  title?: string;
}

const LABEL_HEIGHT = 24; // px reserved at bottom for axis labels — Android clips if not padded
const TOP_PADDING = 8;   // px above tallest bar

export function EmissionBarChart({
  data,
  width,
  height = 200,
  title,
}: EmissionBarChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>No data</Text>
      </View>
    );
  }

  const titleHeight = title ? 28 : 0;
  const maxValue = Math.max(...data.map((d) => d.value), 0.01); // avoid divide-by-zero
  const chartHeight = height - titleHeight; // reserve space for title
  const maxBarHeight = chartHeight - LABEL_HEIGHT - TOP_PADDING;
  const barAreaWidth = width - 32; // 16px padding each side
  const barWidth = barAreaWidth / data.length - 4; // 4px gap between bars

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {/* overflow="visible" prevents Android SVG text clipping outside viewBox (Pitfall 6) */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Svg
        width={width}
        height={chartHeight}
        {...({ overflow: 'visible' } as any)}
      >
        {/* Baseline */}
        <Line
          x1={16}
          y1={chartHeight - LABEL_HEIGHT}
          x2={width - 16}
          y2={chartHeight - LABEL_HEIGHT}
          stroke={colors.border}
          strokeWidth={1}
        />

        {data.map((item, i) => {
          const barH = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0;
          const x = 16 + i * (barWidth + 4);
          const y = TOP_PADDING + (maxBarHeight - barH);

          return (
            <G key={item.label}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 0)}
                fill={item.color}
                rx={4}
              />
              {/* Axis label — positioned below baseline */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 6}
                textAnchor="middle"
                fontSize={10}
                fill={colors.textSecondary}
              >
                {item.label}
              </SvgText>
              {/* Value label above bar — only when bar has meaningful height */}
              {barH > 16 ? (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill={colors.textSecondary}
                >
                  {item.value.toFixed(1)}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  empty: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
