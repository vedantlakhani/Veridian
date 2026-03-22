import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useWeeklySummary } from '@/hooks/useSummaries';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { getLocalDateString } from '@/lib/emissions';
import {
  VProgressRing,
  VMetricCard,
  VCard,
  VSkeleton,
  VEmptyState,
  VBadge,
} from '@/components/ui';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import { colors, spacing, typography } from '@/lib/theme';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  // Derive today's total directly from emission_entries — reactive to new entries immediately
  const { data: todayEntries = [], isLoading: dailyLoading } = useEmissionEntries(user?.id, today, today);
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySummary(user?.id);
  // Fetch most recent entries for the "Recent" section (no date filter)
  const { data: recentEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);

  const todayTotal = todayEntries.reduce((sum, e) => sum + e.kg_co2e_total, 0);
  const progress = Math.min(todayTotal / DAILY_CARBON_BUDGET_KG, 1); // clamp to [0, 1]

  // Determine ring color: green below target, orange approaching budget, red at/over budget
  const ringColor =
    todayTotal <= 7 ? colors.primary :
    todayTotal <= 15 ? colors.warning :
    colors.error;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.greeting}>Today's Impact</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      {/* Progress Ring Card */}
      <VCard elevation="md" style={styles.ringCard}>
        {dailyLoading ? (
          <VSkeleton width={160} height={160} style={styles.skeleton} />
        ) : (
          <View style={styles.ringContainer}>
            <VProgressRing
              progress={progress}
              size={160}
              strokeWidth={12}
              color={ringColor}
            >
              <View style={styles.ringCenter}>
                <Text style={[styles.ringValue, { color: ringColor }]}>
                  {todayTotal.toFixed(1)}
                </Text>
                <Text style={styles.ringUnit}>kg CO₂e</Text>
              </View>
            </VProgressRing>
            <Text style={styles.budgetLabel}>
              of {DAILY_CARBON_BUDGET_KG} kg daily budget
            </Text>
          </View>
        )}
      </VCard>

      {/* Today Metric Card */}
      {dailyLoading ? (
        <View style={{ marginBottom: spacing.md }}>
          <VSkeleton width={'100%' as `${number}%`} height={80} />
        </View>
      ) : (
        <View style={{ marginBottom: spacing.md }}>
          <VMetricCard
            value={todayTotal}
            unit="kg CO₂e"
            label="Today"
            sublabel={`${(progress * 100).toFixed(0)}% of daily budget`}
          />
        </View>
      )}

      {/* Weekly Breakdown */}
      <Text style={styles.sectionTitle}>This Week</Text>
      {weeklyLoading ? (
        <View style={{ marginBottom: spacing.md }}>
          <VSkeleton width={'100%' as `${number}%`} height={96} />
        </View>
      ) : (
        <VCard elevation="sm" style={styles.weeklyCard}>
          <View style={styles.weeklyRow}>
            <CategoryMetric
              label="Food"
              value={weekly?.breakdown?.food ?? 0}
              color={colors.food}
            />
            <CategoryMetric
              label="Transport"
              value={weekly?.breakdown?.transport ?? 0}
              color={colors.transport}
            />
            <CategoryMetric
              label="Energy"
              value={weekly?.breakdown?.energy ?? 0}
              color={colors.energy}
            />
          </View>
          <Text style={styles.weeklyTotal}>
            Total: {(weekly?.total_kg_co2e ?? 0).toFixed(1)} kg CO₂e this week
          </Text>
        </VCard>
      )}

      {/* Recent Entries */}
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      {entriesLoading ? (
        <>
          <View style={{ marginBottom: spacing.sm }}>
            <VSkeleton width={'100%' as `${number}%`} height={56} />
          </View>
          <View style={{ marginBottom: spacing.sm }}>
            <VSkeleton width={'100%' as `${number}%`} height={56} />
          </View>
        </>
      ) : recentEntries.length === 0 ? (
        <VEmptyState
          title="No emissions logged yet"
          body="Tap the Log tab to record your first entry"
        />
      ) : (
        recentEntries.slice(0, 5).map((entry) => (
          <VCard key={entry.id} elevation="sm" style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={styles.entryLeft}>
                <VBadge
                  label={entry.emission_factors.category}
                  variant={entry.emission_factors.category}
                />
                <Text style={styles.entryItem} numberOfLines={1}>
                  {entry.emission_factors.item}
                </Text>
              </View>
              <Text style={styles.entryValue}>
                {entry.kg_co2e_total.toFixed(2)} kg
              </Text>
            </View>
          </VCard>
        ))
      )}
    </ScrollView>
  );
}

// Inline sub-component — avoids creating a separate file for a simple display element
function CategoryMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={catStyles.container}>
      <View style={[catStyles.dot, { backgroundColor: color }]} />
      <Text style={catStyles.label}>{label}</Text>
      <Text style={[catStyles.value, { fontFamily: 'JetBrainsMono' }]}>
        {value.toFixed(1)}
      </Text>
      <Text style={catStyles.unit}>kg</Text>
    </View>
  );
}

const catStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  value: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  unit: { fontSize: 11, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  date: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  ringCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  ringContainer: { alignItems: 'center', gap: spacing.md },
  ringCenter: { alignItems: 'center' },
  ringValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
  },
  ringUnit: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: '500' },
  budgetLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  skeleton: { alignSelf: 'center', marginVertical: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  weeklyCard: { marginBottom: spacing.md },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weeklyTotal: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  entryCard: { marginBottom: spacing.sm },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  entryItem: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  entryValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
