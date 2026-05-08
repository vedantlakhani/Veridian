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
import { colors, spacing, typography, radii } from '@/lib/theme';
import { formatMonthlyDelta } from '@/lib/format';
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

  // Monthly delta — clean formatter (lower CO₂ = good)
  const delta = formatMonthlyDelta(
    monthly?.totalKg ?? 0,
    monthly?.previousMonthTotalKg ?? 0,
  );
  const deltaBg =
    delta.tone === 'good'
      ? 'rgba(61,220,151,0.12)'
      : delta.tone === 'bad'
      ? 'rgba(255,92,92,0.12)'
      : 'rgba(255,255,255,0.06)';
  const deltaFg =
    delta.tone === 'good'
      ? colors.primaryLight
      : delta.tone === 'bad'
      ? colors.danger
      : colors.textSecondary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Insights</Text>
      <Text style={styles.subheading}>Your carbon, decoded.</Text>

      {/* Date Filter Chips — horizontal scroll, fixed height */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 52, marginBottom: spacing.sm }}
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm }}
      >
        {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
          <VChip
            key={f}
            label={f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

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

      {/* Monthly Totals */}
      <Text style={styles.sectionTitle}>Monthly Summary</Text>
      {monthlyLoading ? (
        <VSkeleton width="100%" height={120} style={{ marginBottom: spacing.md }} />
      ) : (
        <VCard
          elevation="lg"
          style={[styles.monthlyCard, { borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={styles.monthlyLabelSmall}>THIS MONTH</Text>
          <Text style={styles.monthlyBigNumber}>
            {(monthly?.totalKg ?? 0).toFixed(1)}
            <Text style={styles.monthlyUnit}> kg CO₂e</Text>
          </Text>

          <View style={[styles.deltaBadge, { backgroundColor: deltaBg }]}>
            <Text style={[styles.deltaBadgeText, { color: deltaFg }]}>
              {delta.label}
            </Text>
          </View>

          <View style={styles.monthlyBreakdown}>
            {[
              { label: 'Food', value: monthly?.foodKg ?? 0, color: colors.food },
              { label: 'Transport', value: monthly?.transportKg ?? 0, color: colors.transport },
              { label: 'Energy', value: monthly?.energyKg ?? 0, color: colors.energy },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.monthlyBreakdownItem}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.monthlyDetailLabel}>{label}</Text>
                <Text style={[styles.monthlyDetailValue, { color }]}>
                  {value.toFixed(1)} kg
                </Text>
              </View>
            ))}
          </View>
        </VCard>
      )}

      {/* History List */}
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
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chartCard: { marginBottom: spacing.md, alignItems: 'center' },

  // Monthly card
  monthlyCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  monthlyLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 6,
  },
  monthlyBigNumber: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 38,
  },
  monthlyUnit: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  deltaBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: spacing.sm,
  },
  deltaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  monthlyBreakdown: {
    flexDirection: 'column',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  monthlyBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monthlyDetailLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  monthlyDetailValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },

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
    backgroundColor: colors.danger,
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
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
