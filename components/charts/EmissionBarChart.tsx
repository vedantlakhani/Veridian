import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { VPressable } from '@/components/ui/VPressable';
import { colors, spacing, typography, radii, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// EmissionBarChart — bars grow from the baseline on mount (staggered),
// press a bar for a haptic tick + floating tooltip. Two modes:
//   'category' — a few labeled bars (food / transport / energy)
//   'daily'    — many thin bars, one per day, colored by budget state
// ─────────────────────────────────────────────────────────────────────────────

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
  mode?: 'category' | 'daily';
}

const LABEL_HEIGHT = 22;
const TOOLTIP_HEIGHT = 26;

function Bar({
  item,
  index,
  maxValue,
  maxBarHeight,
  barWidth,
  showLabel,
  onSelect,
  selected,
}: {
  item: BarChartDataItem;
  index: number;
  maxValue: number;
  maxBarHeight: number;
  barWidth: number;
  showLabel: boolean;
  onSelect: (index: number) => void;
  selected: boolean;
}) {
  const grow = useSharedValue(0);
  const barH = Math.max(maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0, 2);

  useEffect(() => {
    grow.value = withDelay(
      index * motion.staggerStep,
      withSpring(1, motion.springGentle),
    );
  }, [grow, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: grow.value }],
  }));

  return (
    <VPressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(index);
      }}
      style={[styles.barColumn, { width: barWidth }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}: ${item.value.toFixed(1)} kilograms`}
    >
      <View style={[styles.barTrack, { height: maxBarHeight }]}>
        <Animated.View
          style={[
            styles.bar,
            {
              height: barH,
              backgroundColor: item.color,
              opacity: selected ? 1 : 0.9,
            },
            animatedStyle,
          ]}
        />
      </View>
      {showLabel ? (
        <Text style={styles.axisLabel} numberOfLines={1}>
          {item.label}
        </Text>
      ) : (
        <View style={{ height: 0 }} />
      )}
    </VPressable>
  );
}

export function EmissionBarChart({
  data,
  width,
  height = 200,
  title,
  mode = 'category',
}: EmissionBarChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>No data</Text>
      </View>
    );
  }

  const titleHeight = title ? 26 : 0;
  const isDaily = mode === 'daily';
  const showLabels = !isDaily || data.length <= 7;
  const labelSpace = showLabels ? LABEL_HEIGHT : 4;
  const maxValue = Math.max(...data.map((d) => d.value), 0.01);
  const maxBarHeight = height - titleHeight - labelSpace - TOOLTIP_HEIGHT;

  const gap = isDaily ? 3 : 12;
  const rawBarWidth = (width - gap * (data.length - 1)) / data.length;
  const barWidth = isDaily
    ? Math.max(rawBarWidth, 4)
    : Math.min(Math.max(rawBarWidth, 16), 48);

  const selected = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <View style={[styles.container, { width }]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      {/* Tooltip row — fixed height so the chart never jumps */}
      <View style={styles.tooltipRow}>
        {selected ? (
          <View style={styles.tooltip}>
            <View style={[styles.tooltipDot, { backgroundColor: selected.color }]} />
            <Text style={styles.tooltipText}>
              {selected.label} · {selected.value.toFixed(1)} kg
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.chartArea, { height: maxBarHeight + labelSpace }]}>
        {/* Faint gridlines at 25/50/75% */}
        {[0.25, 0.5, 0.75].map((p) => (
          <View
            key={p}
            style={[
              styles.gridline,
              { bottom: labelSpace + maxBarHeight * p },
            ]}
            pointerEvents="none"
          />
        ))}
        {/* Baseline */}
        <View style={[styles.baseline, { bottom: labelSpace }]} pointerEvents="none" />

        <View style={[styles.barsRow, { gap }]}>
          {data.map((item, i) => (
            <Bar
              key={`${item.label}-${i}`}
              item={item}
              index={i}
              maxValue={maxValue}
              maxBarHeight={maxBarHeight}
              barWidth={barWidth}
              showLabel={showLabels}
              selected={selectedIndex === i}
              onSelect={(idx) => setSelectedIndex((cur) => (cur === idx ? null : idx))}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  title: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  empty: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  tooltipRow: {
    height: TOOLTIP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  tooltipText: {
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chartArea: {
    width: '100%',
    position: 'relative',
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  barColumn: {
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    transformOrigin: 'bottom',
  },
  axisLabel: {
    height: LABEL_HEIGHT,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
