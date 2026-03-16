import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useWeeklySummary, useMonthlyTotals } from '@/hooks/useSummaries';
import { getLocalDateString, getISOWeekStart } from '@/lib/emissions';
import { EmissionBarChart } from '@/components/charts/EmissionBarChart';
import { VChip, VCard, VBadge, VSkeleton, VEmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import type { EmissionCategory } from '@/types/emission';

type DateFilter = 'today' | 'week' | 'month';

function getDateRange(filter: DateFilter): { dateFrom: string; dateTo: string } {
  const today = getLocalDateString();
  if (filter === 'today') return { dateFrom: today, dateTo: today };
  if (filter === 'week') {
    return { dateFrom: getISOWeekStart(new Date()), dateTo: today };
  }
  // month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { dateFrom: monthStart, dateTo: today };
}

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 2;

  const [filter, setFilter] = useState<DateFilter>('week');
  const { dateFrom, dateTo } = getDateRange(filter);

  const { data: entries = [], isLoading: entriesLoading } = useEmissionEntries(
    user?.id, dateFrom, dateTo
  );
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySummary(user?.id);
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyTotals(user?.id);

  // Build bar chart data from weekly breakdown
  const barChartData = [
    { label: 'Food', value: weekly?.breakdown?.food ?? 0, color: colors.food },
    { label: 'Transport', value: weekly?.breakdown?.transport ?? 0, color: colors.transport },
    { label: 'Energy', value: weekly?.breakdown?.energy ?? 0, color: colors.energy },
  ];

  // Format trend label for monthly comparison
  const trendLabel =
    monthly?.trendPercent !== null && monthly?.trendPercent !== undefined
      ? `${monthly.trendPercent > 0 ? '+' : ''}${monthly.trendPercent.toFixed(1)}% vs last month`
      : null;

  const trendDirection: 'up' | 'down' | 'neutral' =
    monthly?.trendPercent === null || monthly?.trendPercent === undefined ? 'neutral' :
    monthly.trendPercent < 0 ? 'down' : 'up';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Insights</Text>

      {/* Date Filter Chips */}
      <View style={styles.filterRow}>
        {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
          <VChip
            key={f}
            label={f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      {/* Weekly Bar Chart */}
      <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
      {weeklyLoading ? (
        <VSkeleton width={chartWidth} height={200} style={{ marginBottom: spacing.md }} />
      ) : (
        <VCard elevation="sm" style={styles.chartCard}>
          <EmissionBarChart
            data={barChartData}
            width={chartWidth - spacing.lg * 2} // account for VCard padding
            height={200}
            title="kg CO\u2082e by category this week"
          />
        </VCard>
      )}

      {/* Monthly Totals — TRACK-07 */}
      <Text style={styles.sectionTitle}>Monthly Summary</Text>
      {monthlyLoading ? (
        <VSkeleton width="100%" height={80} style={{ marginBottom: spacing.md }} />
      ) : (
        <VCard elevation="sm" style={styles.monthlyCard}>
          <View style={styles.monthlyRow}>
            <View>
              <Text style={styles.monthlyLabel}>This Month</Text>
              <Text style={styles.monthlyValue}>
                <Text style={{ fontFamily: 'JetBrainsMono' }}>
                  {(monthly?.totalKg ?? 0).toFixed(1)}
                </Text>
                {' kg CO\u2082e'}
              </Text>
            </View>
            {trendLabel ? (
              <Text style={[styles.trendBadge,
                { color: trendDirection === 'down' ? colors.success : colors.error }
              ]}>
                {trendDirection === 'down' ? '\u2193' : '\u2191'} {trendLabel}
              </Text>
            ) : null}
          </View>
          <View style={styles.monthlyBreakdown}>
            <Text style={styles.monthlyDetail}>
              Food {(monthly?.foodKg ?? 0).toFixed(1)} kg
            </Text>
            <Text style={styles.monthlyDetail}>
              Transport {(monthly?.transportKg ?? 0).toFixed(1)} kg
            </Text>
            <Text style={styles.monthlyDetail}>
              Energy {(monthly?.energyKg ?? 0).toFixed(1)} kg
            </Text>
          </View>
        </VCard>
      )}

      {/* History List — TRACK-08 */}
      <Text style={styles.sectionTitle}>
        {filter === 'today' ? "Today's Entries" :
         filter === 'week' ? "This Week's Entries" :
         "This Month's Entries"}
      </Text>
      {entriesLoading ? (
        <>
          <VSkeleton width="100%" height={56} style={{ marginBottom: spacing.sm }} />
          <VSkeleton width="100%" height={56} style={{ marginBottom: spacing.sm }} />
          <VSkeleton width="100%" height={56} />
        </>
      ) : entries.length === 0 ? (
        <VEmptyState
          title="No entries found"
          body="Log emissions using the Log tab"
        />
      ) : (
        entries.map((entry) => (
          <VCard key={entry.id} elevation="sm" style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={styles.entryLeft}>
                <VBadge
                  label={entry.emission_factors.category}
                  variant={entry.emission_factors.category as EmissionCategory}
                />
                <View>
                  <Text style={styles.entryItem} numberOfLines={1}>
                    {entry.emission_factors.item}
                  </Text>
                  <Text style={styles.entryDate}>
                    {new Date(entry.logged_at).toLocaleDateString('en-GB', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: {
    fontSize: typography.sizes.xxl, fontWeight: '700',
    color: colors.textPrimary, marginBottom: spacing.lg,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  sectionTitle: {
    fontSize: typography.sizes.lg, fontWeight: '700',
    color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm,
  },
  chartCard: { marginBottom: spacing.md, alignItems: 'center' },
  monthlyCard: { marginBottom: spacing.md },
  monthlyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  monthlyLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: 2 },
  monthlyValue: { fontSize: typography.sizes.lg, color: colors.textPrimary },
  trendBadge: { fontSize: typography.sizes.sm, fontWeight: '600', marginTop: 4 },
  monthlyBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  monthlyDetail: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  entryCard: { marginBottom: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  entryItem: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textPrimary },
  entryDate: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  entryValue: {
    fontFamily: 'JetBrainsMono', fontSize: typography.sizes.sm,
    fontWeight: '600', color: colors.textPrimary,
  },
});
