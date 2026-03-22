import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { VCard, VBadge } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import type { Challenge } from '@/types/challenge';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', opts);
  const end = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', opts);
  return `${start} – ${end}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const dateRange = formatDateRange(challenge.start_date, challenge.end_date);
  const reductionLabel = `-${challenge.target_reduction_pct}%`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <VCard elevation="sm" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {challenge.title}
            </Text>
            <Text style={styles.dateRange}>{dateRange}</Text>
          </View>
          <View style={styles.right}>
            <VBadge label={reductionLabel} variant="success" />
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </VCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  dateRange: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chevron: {
    fontSize: typography.sizes.xl,
    color: colors.textTertiary,
    lineHeight: typography.sizes.xl * 1.2,
  },
});
