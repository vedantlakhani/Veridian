import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useLeaderboard, useChallengeDetail } from '@/hooks/useLeaderboard';
import { useChallengeRealtime } from '@/hooks/useChallengeRealtime';
import { VCard, VBadge, VSkeleton, VEmptyState } from '@/components/ui';
import LeaderboardRow from '@/components/social/LeaderboardRow';
import { colors, spacing, typography } from '@/lib/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const start = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', opts);
  const end = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', opts);
  return `${start} – ${end}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  // Mount Realtime subscription — scoped to this screen, auto-cleaned up on navigate away
  useChallengeRealtime(id);

  const { data: challenge, isLoading: challengeLoading } = useChallengeDetail(id);
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useLeaderboard(id);

  const isLoading = challengeLoading || leaderboardLoading;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Screen header — title updates once challenge data loads */}
      <Stack.Screen
        options={{
          title: challenge?.title ?? 'Challenge',
          headerBackTitle: 'Profile',
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Challenge Header ── */}
        <VCard elevation="md" style={styles.headerCard}>
          {challengeLoading ? (
            <>
              <VSkeleton width={'80%' as `${number}%`} height={24} style={styles.skeletonTitle} />
              <VSkeleton width={'60%' as `${number}%`} height={16} style={styles.skeletonSub} />
            </>
          ) : challenge ? (
            <>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.dateRange}>
                {formatDateRange(challenge.start_date, challenge.end_date)}
              </Text>
              <View style={styles.metaRow}>
                <VBadge label={`Target: −${challenge.target_reduction_pct}%`} variant="success" />
                <Text style={styles.participantCount}>
                  {leaderboard.length} participant{leaderboard.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          ) : null}
        </VCard>

        {/* ── Leaderboard Section ── */}
        <Text style={styles.sectionLabel}>Leaderboard</Text>

        {isLoading ? (
          // 5 skeleton rows while data loads
          <VCard elevation="sm" style={styles.leaderboardCard}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <VSkeleton width={'100%' as `${number}%`} height={56} />
              </View>
            ))}
          </VCard>
        ) : leaderboard.length === 0 ? (
          <VEmptyState
            title="No participants yet"
            body="Be the first to join and set the pace"
          />
        ) : (
          // Privacy (SOCL-06): only rank, avatar, display_name, and reduction % are displayed
          // Raw kg values are never shown to other users
          <VCard elevation="sm" style={styles.leaderboardCard}>
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))}
          </VCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    marginBottom: spacing.lg,
  },
  challengeTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateRange: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  skeletonTitle: {
    marginBottom: spacing.xs,
  },
  skeletonSub: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  leaderboardCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  skeletonRow: {
    marginBottom: 1,
  },
});
