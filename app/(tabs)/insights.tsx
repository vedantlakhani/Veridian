import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useEmissionEntries, useDeleteEntry } from '@/hooks/useEmissionEntries';
import { useMonthlyTotals } from '@/hooks/useSummaries';
import { getLocalDateString, getISOWeekStart } from '@/lib/emissions';
import { EmissionBarChart } from '@/components/charts/EmissionBarChart';
import { VChip, VCard, VBadge, VSkeleton, VEmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import type { EmissionCategory, EmissionEntryWithFactor } from '@/types/emission';

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

// ─── EntryRow component with swipe-to-delete and tap-to-edit ────────────────
function EntryRow({ entry, userId }: { entry: EmissionEntryWithFactor; userId: string }) {
  const deleteEntry = useDeleteEntry();
  const translateX = useSharedValue(0);
  const REVEAL_THRESHOLD = -60;
  const DELETE_BUTTON_WIDTH = 80;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // only horizontal swipes
    .onUpdate((e) => {
      // Only allow left swipe (negative), cap at -DELETE_BUTTON_WIDTH
      translateX.value = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < REVEAL_THRESHOLD) {
        // Snap to reveal delete button
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH);
      } else {
        // Snap back
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDelete = () => {
    deleteEntry.mutate({ id: entry.id, userId, loggedAt: entry.logged_at });
  };

  const navigateToEdit = () => {
    router.push(`/entry/${entry.id}`);
  };

  return (
    <View style={styles.entryRowWrapper}>
      {/* Delete button revealed behind the row */}
      <View style={styles.deleteButton}>
        <TouchableOpacity
          style={styles.deleteButtonInner}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>
          <Pressable onPress={() => runOnJS(navigateToEdit)()}>
            <VCard elevation="sm" style={styles.entryCard}>
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
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chartWidth = width - spacing.lg * 2;

  const [filter, setFilter] = useState<DateFilter>('week');
  const { dateFrom, dateTo } = getDateRange(filter);

  const { data: entries = [], isLoading: entriesLoading } = useEmissionEntries(
    user?.id, dateFrom, dateTo
  );
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyTotals(user?.id);

  // Build bar chart data from filtered entries — respects the active date filter
  const categoryTotals = entries.reduce<Record<string, number>>((acc, e) => {
    const cat = e.emission_factors.category;
    acc[cat] = (acc[cat] ?? 0) + e.kg_co2e_total;
    return acc;
  }, {});
  const barChartData = [
    { label: 'Food', value: categoryTotals['food'] ?? 0, color: colors.food },
    { label: 'Transport', value: categoryTotals['transport'] ?? 0, color: colors.transport },
    { label: 'Energy', value: categoryTotals['energy'] ?? 0, color: colors.energy },
  ];
  const chartTitle =
    filter === 'today' ? 'Today · kg CO₂e' :
    filter === 'week' ? 'This week · kg CO₂e' :
    'This month · kg CO₂e';

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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
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

      {/* Bar Chart — respects active filter */}
      <Text style={styles.sectionTitle}>
        {filter === 'today' ? "Today's Breakdown" :
         filter === 'week' ? 'Weekly Breakdown' :
         'Monthly Breakdown'}
      </Text>
      {entriesLoading ? (
        <VSkeleton width={chartWidth} height={200} style={{ marginBottom: spacing.md }} />
      ) : (
        <VCard elevation="sm" style={styles.chartCard}>
          <EmissionBarChart
            data={barChartData}
            width={chartWidth - spacing.lg * 2}
            height={200}
            title={chartTitle}
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

      {/* History List — TRACK-08, TRACK-09, TRACK-10, TRACK-11 */}
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
          <EntryRow key={entry.id} entry={entry} userId={user!.id} />
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
    marginTop: spacing.lg,
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
  // Entry row styles
  entryRowWrapper: { marginBottom: spacing.sm, position: 'relative' },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButtonInner: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  entryCard: {},
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  entryItem: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textPrimary },
  entryDate: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  entryValue: {
    fontFamily: 'JetBrainsMono', fontSize: typography.sizes.sm,
    fontWeight: '600', color: colors.textPrimary,
  },
});
