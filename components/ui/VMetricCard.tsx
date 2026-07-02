import type { ReactNode } from 'react';
import { View, Text, StyleSheet, type GestureResponderEvent } from 'react-native';
import { VCard } from './VCard';
import { VIcon } from './VIcon';
import { VCountUp } from './VCountUp';
import { VSparkline } from './VSparkline';
import { colors, typography, spacing } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VMetricCard — a number with presence: category accent, count-up value,
// icon trend arrows, optional sparkline footer.
// ─────────────────────────────────────────────────────────────────────────────

interface VMetricCardProps {
  value: number | string;
  unit: string;
  label: string;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
  icon?: ReactNode;
  sparkline?: number[];
  onPress?: (e: GestureResponderEvent) => void;
  /** Animate the number counting up (numeric values only) */
  countUp?: boolean;
}

export function VMetricCard({
  value,
  unit,
  label,
  sublabel,
  trend,
  trendValue,
  accentColor = colors.primary,
  icon,
  sparkline,
  onPress,
  countUp = true,
}: VMetricCardProps) {
  const trendColor =
    trend === 'down' ? colors.success :
    trend === 'up'   ? colors.danger  :
    colors.textSecondary;

  const isNumeric = typeof value === 'number';

  return (
    <VCard elevation="sm" style={styles.card} accentColor={accentColor} onPress={onPress}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        {isNumeric && countUp ? (
          <VCountUp value={value} decimals={1} style={styles.value} />
        ) : (
          <Text style={styles.value}>
            {isNumeric ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
          </Text>
        )}
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {(sublabel || trendValue) ? (
        <View style={styles.footer}>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
          {trendValue ? (
            <View style={styles.trendRow}>
              {trend === 'up' || trend === 'down' ? (
                <VIcon
                  name={trend === 'up' ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={trendColor}
                  strokeWidth={2.5}
                />
              ) : null}
              <Text style={[styles.trend, { color: trendColor }]}>{trendValue}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {sparkline && sparkline.length > 1 ? (
        <View style={styles.sparklineWrap}>
          <VSparkline data={sparkline} width={96} height={22} color={accentColor} />
        </View>
      ) : null}
    </VCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  unit: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: typography.fontFamilyMono,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sublabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trend: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  sparklineWrap: {
    marginTop: spacing.sm,
  },
});
