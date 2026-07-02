import { View, Text, StyleSheet } from 'react-native';
import { VCard, VBadge, VIcon, VProgressBar } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import type { Challenge } from '@/types/challenge';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', opts);
  const end = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', opts);
  return `${start} – ${end}`;
}

/** 0..1 — how far through the challenge window we are */
function timeProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T23:59:59').getTime();
  const now = Date.now();
  if (end <= start) return 1;
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

export default function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const dateRange = formatDateRange(challenge.start_date, challenge.end_date);
  const reductionLabel = `-${challenge.target_reduction_pct}%`;
  const progress = timeProgress(challenge.start_date, challenge.end_date);
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(challenge.end_date + 'T23:59:59').getTime() - Date.now()) / 86_400_000,
    ),
  );

  return (
    <VCard elevation="sm" style={styles.card} onPress={onPress} haptic="light">
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {challenge.title}
          </Text>
          <Text style={styles.dateRange}>{dateRange}</Text>
        </View>
        <View style={styles.right}>
          <VBadge label={reductionLabel} variant="success" />
          <VIcon name="chevron-right" size={16} color={colors.textTertiary} />
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <VProgressBar progress={progress} height={4} color={colors.primaryLight} />
        </View>
        <Text style={styles.daysLeft}>
          {daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}
        </Text>
      </View>
    </VCard>
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  progressBar: {
    flex: 1,
  },
  daysLeft: {
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
});
