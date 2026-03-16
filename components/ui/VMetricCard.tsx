import { View, Text, StyleSheet } from 'react-native';
import { VCard } from './VCard';
import { colors, typography, spacing } from '@/lib/theme';

interface VMetricCardProps {
  value: number | string;
  unit: string;
  label: string;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function VMetricCard({
  value,
  unit,
  label,
  sublabel,
  trend,
  trendValue,
}: VMetricCardProps) {
  const trendColor =
    trend === 'down' ? colors.success :
    trend === 'up'   ? colors.error   :
    colors.textSecondary;

  return (
    <VCard elevation="sm">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {/* JetBrains Mono for the number — required by design spec */}
        <Text style={styles.value}>{typeof value === 'number' ? value.toFixed(1) : value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {(sublabel || trendValue) ? (
        <View style={styles.footer}>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
          {trendValue ? (
            <Text style={[styles.trend, { color: trendColor }]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </Text>
          ) : null}
        </View>
      ) : null}
    </VCard>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    // CRITICAL: JetBrains Mono for carbon numbers per design spec
    fontFamily: 'JetBrainsMono',
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unit: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'JetBrainsMono',
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
  trend: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
});
