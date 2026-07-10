import { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useEmissionEntries, useDeleteEntry } from '@/hooks/useEmissionEntries';
import { useMonthlyTotals } from '@/hooks/useSummaries';
import { useStreak } from '@/hooks/useStreak';
import { supabase } from '@/lib/supabase';
import { getLocalDateString, getISOWeekStart } from '@/lib/emissions';
import { EmissionBarChart } from '@/components/charts/EmissionBarChart';
import {
  VChip,
  VCard,
  VBadge,
  VSkeleton,
  VEmptyState,
  VText,
  VIcon,
  VCountUp,
  VPressable,
  VProgressBar,
  SwipeableEntryRow,
} from '@/components/ui';
import {
  colors,
  spacing,
  typography,
  radii,
  motion,
  budgetStateFor,
  budgetStateColors,
} from '@/lib/theme';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import type { EmissionCategory, EmissionEntryWithFactor } from '@/types/emission';

type DateFilter = 'today' | 'week' | 'month';

function getDateRange(filter: DateFilter): { dateFrom: string; dateTo: string } {
  const today = getLocalDateString();
  if (filter === 'today') return { dateFrom: today, dateTo: today };
  if (filter === 'week') {
    return { dateFrom: getISOWeekStart(new Date()), dateTo: today };
  }
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { dateFrom: monthStart, dateTo: today };
}

const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  food: colors.food,
  transport: colors.transport,
  energy: colors.energy,
  shopping: colors.shopping,
};

const CATEGORY_LABELS: Record<EmissionCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  energy: 'Energy',
  shopping: 'Shopping',
};

// ─── Section title ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleAccent} />
      <VText variant="heading">{children}</VText>
    </View>
  );
}

// ─── Story card — the genuine headline for the active period ─────────────────
function StoryCard({
  filter,
  entries,
  trendPercent,
}: {
  filter: DateFilter;
  entries: EmissionEntryWithFactor[];
  trendPercent: number | null;
}) {
  const periodTotal = entries.reduce((sum, e) => sum + e.kg_co2e_total, 0);

  // Composition sentence — "Transport drove 62% of your week"
  const story = useMemo(() => {
    if (periodTotal === 0) return 'Log an entry to start your story.';
    const totals: Record<EmissionCategory, number> = { food: 0, transport: 0, energy: 0, shopping: 0 };
    const dayTotals = new Map<string, number>();
    for (const e of entries) {
      const cat = e.emission_factors.category as EmissionCategory;
      totals[cat] = (totals[cat] ?? 0) + e.kg_co2e_total;
      const day = getLocalDateString(new Date(e.logged_at));
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + e.kg_co2e_total);
    }
    const topCat = (Object.keys(totals) as EmissionCategory[]).reduce((a, b) =>
      totals[a] >= totals[b] ? a : b,
    );
    const pct = Math.round((totals[topCat] / periodTotal) * 100);
    const periodName = filter === 'today' ? 'day' : filter === 'week' ? 'week' : 'month';

    if (filter === 'today') {
      return `${CATEGORY_LABELS[topCat]} drove ${pct}% of your ${periodName} so far.`;
    }
    let peakDay = '';
    let peakKg = 0;
    for (const [day, kg] of dayTotals) {
      if (kg > peakKg) {
        peakKg = kg;
        peakDay = day;
      }
    }
    const peakName = peakDay
      ? new Date(peakDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
      : '';
    return `${CATEGORY_LABELS[topCat]} drove ${pct}% of your ${periodName}${
      peakName ? ` — ${peakName} was your biggest day.` : '.'
    }`;
  }, [entries, periodTotal, filter]);

  // Numeric delta — no label re-parsing, no NaN
  const showDelta = filter === 'month' && trendPercent !== null;
  const deltaGood = (trendPercent ?? 0) < 0;

  return (
    <View style={storyStyles.wrapper}>
      <View style={storyStyles.inner}>
        <VText variant="label" style={storyStyles.periodLabel}>
          {filter === 'today' ? 'Today' : filter === 'week' ? 'This week' : 'This month'}
        </VText>
        <View style={storyStyles.totalRow}>
          <VCountUp value={periodTotal} decimals={1} style={storyStyles.total} />
          <VText variant="caption" style={storyStyles.totalUnit}>
            kg CO₂e
          </VText>
          {showDelta && (
            <View
              style={[
                storyStyles.deltaChip,
                { backgroundColor: deltaGood ? colors.successGlow : colors.dangerGlow },
              ]}
            >
              <VIcon
                name={deltaGood ? 'arrow-down' : 'arrow-up'}
                size={10}
                color={deltaGood ? colors.primaryLight : colors.danger}
                strokeWidth={2.5}
              />
              <VText
                variant="mono"
                style={[
                  storyStyles.deltaText,
                  { color: deltaGood ? colors.primaryLight : colors.danger },
                ]}
              >
                {Math.abs(trendPercent!).toFixed(1)}%
              </VText>
            </View>
          )}
        </View>
        <VText variant="caption" style={storyStyles.storyLine}>
          {story}
        </VText>
      </View>
    </View>
  );
}

const storyStyles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftColor: colors.primary,
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  inner: { padding: spacing.lg },
  periodLabel: { marginBottom: spacing.xs, color: colors.textSecondary },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  total: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  totalUnit: { fontSize: typography.sizes.md, color: colors.textSecondary },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  deltaText: { fontSize: typography.sizes.xs },
  storyLine: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});

// ─── Personal records strip ───────────────────────────────────────────────────
function RecordCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={recordStyles.card}>
      <VText variant="label" style={recordStyles.label}>
        {label}
      </VText>
      <View style={recordStyles.valueRow}>
        <VText variant="mono" style={recordStyles.value}>
          {value}
        </VText>
        {unit ? (
          <VText variant="caption" style={recordStyles.unit}>
            {unit}
          </VText>
        ) : null}
      </View>
    </View>
  );
}

const recordStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontSize: 9, color: colors.textSecondary },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: spacing.xs,
  },
  value: { fontSize: 18 },
  unit: { fontSize: 10 },
});

// ─── Insights screen ──────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chartWidth = width - spacing.lg * 2;

  const [filter, setFilter] = useState<DateFilter>('week');
  const [highlightCat, setHighlightCat] = useState<EmissionCategory | null>(null);
  const { dateFrom, dateTo } = getDateRange(filter);

  const { data: entries = [], isLoading: entriesLoading } = useEmissionEntries(
    user?.id,
    dateFrom,
    dateTo,
  );
  const { data: monthly } = useMonthlyTotals(user?.id);
  const { streak } = useStreak(user?.id);
  const deleteEntry = useDeleteEntry();

  // Personal records — best (lowest) day and week from summaries
  const { data: records } = useQuery({
    queryKey: ['personal_records', user?.id],
    queryFn: async () => {
      const [dayRes, weekRes] = await Promise.all([
        supabase
          .from('daily_summaries')
          .select('total_kg_co2e')
          .eq('user_id', user!.id)
          .gt('total_kg_co2e', 0)
          .order('total_kg_co2e', { ascending: true })
          .limit(1),
        supabase
          .from('weekly_summaries')
          .select('total_kg_co2e')
          .eq('user_id', user!.id)
          .gt('total_kg_co2e', 0)
          .order('total_kg_co2e', { ascending: true })
          .limit(1),
      ]);
      if (dayRes.error) throw dayRes.error;
      if (weekRes.error) throw weekRes.error;
      return {
        bestDay: dayRes.data?.[0]?.total_kg_co2e ?? null,
        bestWeek: weekRes.data?.[0]?.total_kg_co2e ?? null,
      };
    },
    enabled: !!user?.id,
  });

  // ── Cross-fade on period switch ──
  const contentOpacity = useSharedValue(1);
  useEffect(() => {
    contentOpacity.value = 0;
    contentOpacity.value = withTiming(1, { duration: motion.timingBase });
  }, [filter, contentOpacity]);
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  // ── Temporal chart data — the missing time axis ──
  const chartData = useMemo(() => {
    if (filter === 'today') {
      const totals = entries.reduce<Record<string, number>>((acc, e) => {
        const cat = e.emission_factors.category;
        acc[cat] = (acc[cat] ?? 0) + e.kg_co2e_total;
        return acc;
      }, {});
      return [
        { label: 'Food', value: totals['food'] ?? 0, color: colors.food },
        { label: 'Transport', value: totals['transport'] ?? 0, color: colors.transport },
        { label: 'Energy', value: totals['energy'] ?? 0, color: colors.energy },
      ];
    }
    // Daily bars colored by that day's budget state
    const dayTotals = new Map<string, number>();
    for (const e of entries) {
      const day = getLocalDateString(new Date(e.logged_at));
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + e.kg_co2e_total);
    }
    const out: { label: string; value: number; color: string }[] = [];
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = getLocalDateString(d);
      const kg = dayTotals.get(key) ?? 0;
      const state = budgetStateFor(kg / DAILY_CARBON_BUDGET_KG);
      out.push({
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        value: kg,
        color: kg === 0 ? colors.trackOnDark : budgetStateColors[state].accent,
      });
    }
    return out;
  }, [entries, filter, dateFrom, dateTo]);

  // ── Composition segments ──
  const composition = useMemo(() => {
    const totals: Record<EmissionCategory, number> = { food: 0, transport: 0, energy: 0, shopping: 0 };
    for (const e of entries) {
      const cat = e.emission_factors.category as EmissionCategory;
      totals[cat] += e.kg_co2e_total;
    }
    return totals;
  }, [entries]);
  const compositionTotal = composition.food + composition.transport + composition.energy;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      showsVerticalScrollIndicator={false}
    >
      <VText variant="title" style={styles.heading}>
        Insights
      </VText>
      <VText variant="caption" style={styles.subheading}>
        Your carbon, decoded.
      </VText>

      {/* Period chips — everything below obeys this filter */}
      <View style={styles.chipRow}>
        {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
          <VChip
            key={f}
            label={f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'Month'}
            selected={filter === f}
            onPress={() => setFilter(f)}
            grow
          />
        ))}
      </View>

      <Animated.View style={contentStyle}>
        {/* Story card */}
        {entriesLoading ? (
          <VSkeleton width="100%" height={130} style={{ marginBottom: spacing.md }} />
        ) : (
          <StoryCard
            filter={filter}
            entries={entries}
            trendPercent={monthly?.trendPercent ?? null}
          />
        )}

        {/* Temporal chart */}
        <SectionTitle>
          {filter === 'today' ? "Today's Breakdown" : filter === 'week' ? 'Day by Day' : 'Daily Trend'}
        </SectionTitle>
        {entriesLoading ? (
          <VSkeleton width={chartWidth} height={200} style={{ marginBottom: spacing.md }} />
        ) : (
          <VCard elevation="sm" style={styles.chartCard}>
            <EmissionBarChart
              data={chartData}
              width={chartWidth - spacing.lg * 2}
              height={190}
              mode={filter === 'today' ? 'category' : 'daily'}
            />
          </VCard>
        )}

        {/* Composition */}
        {compositionTotal > 0 && (
          <>
            <SectionTitle>Composition</SectionTitle>
            <VCard elevation="sm" style={styles.compositionCard}>
              <VProgressBar
                segments={[
                  { value: composition.food, color: colors.food },
                  { value: composition.transport, color: colors.transport },
                  { value: composition.energy, color: colors.energy },
                ]}
                height={10}
              />
              <View style={styles.legendRow}>
                {(Object.keys(composition) as EmissionCategory[]).map((cat) => {
                  const active = highlightCat === null || highlightCat === cat;
                  const pct =
                    compositionTotal > 0
                      ? Math.round((composition[cat] / compositionTotal) * 100)
                      : 0;
                  return (
                    <VPressable
                      key={cat}
                      onPress={() => setHighlightCat((cur) => (cur === cat ? null : cat))}
                      haptic="light"
                      style={[styles.legendItem, !active && { opacity: 0.35 }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: highlightCat === cat }}
                    >
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                      <VText variant="caption" style={styles.legendLabel}>
                        {CATEGORY_LABELS[cat]}
                      </VText>
                      <VText variant="mono" style={[styles.legendPct, { color: CATEGORY_COLORS[cat] }]}>
                        {pct}%
                      </VText>
                    </VPressable>
                  );
                })}
              </View>
            </VCard>
          </>
        )}

        {/* Personal records */}
        <SectionTitle>Personal Records</SectionTitle>
        <View style={styles.recordsRow}>
          <RecordCard
            label="Best day"
            value={records?.bestDay != null ? records.bestDay.toFixed(1) : '—'}
            unit={records?.bestDay != null ? 'kg' : undefined}
          />
          <RecordCard
            label="Best week"
            value={records?.bestWeek != null ? records.bestWeek.toFixed(1) : '—'}
            unit={records?.bestWeek != null ? 'kg' : undefined}
          />
          <RecordCard label="Streak" value={String(streak)} unit={streak === 1 ? 'day' : 'days'} />
        </View>

        {/* Entries */}
        <SectionTitle>
          {filter === 'today' ? "Today's Entries" : filter === 'week' ? "This Week's Entries" : "This Month's Entries"}
        </SectionTitle>
        {entriesLoading ? (
          <View style={{ gap: spacing.sm }}>
            <VSkeleton width="100%" height={56} />
            <VSkeleton width="100%" height={56} />
            <VSkeleton width="100%" height={56} />
          </View>
        ) : entries.length === 0 ? (
          <VEmptyState
            title="No entries found"
            body="Log emissions using the Log tab"
            icon={<VIcon name="leaf" size={40} color={colors.textTertiary} />}
          />
        ) : (
          entries.map((entry) => {
            const cat = entry.emission_factors.category as EmissionCategory;
            const dimmed = highlightCat !== null && highlightCat !== cat;
            return (
              <View key={entry.id} style={dimmed ? { opacity: 0.35 } : undefined}>
                <SwipeableEntryRow
                  accentColor={CATEGORY_COLORS[cat] ?? colors.primary}
                  onDelete={() =>
                    deleteEntry.mutate({
                      id: entry.id,
                      userId: user?.id ?? '',
                      loggedAt: entry.logged_at,
                    })
                  }
                  onPress={() => router.push(`/entry/${entry.id}`)}
                >
                  <View style={styles.entryLeft}>
                    <VBadge label={cat} variant={cat} size="sm" />
                    <View style={{ flex: 1 }}>
                      <VText variant="body" style={styles.entryItem} numberOfLines={1}>
                        {entry.emission_factors.item}
                      </VText>
                      <VText variant="caption" style={styles.entryDate}>
                        {new Date(entry.logged_at).toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </VText>
                    </View>
                  </View>
                  <VText variant="mono" style={styles.entryValue}>
                    {entry.kg_co2e_total.toFixed(2)} kg
                  </VText>
                </SwipeableEntryRow>
              </View>
            );
          })
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginTop: spacing.lg },
  subheading: { marginBottom: spacing.md, marginTop: 2 },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleAccent: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: colors.primaryLight,
  },
  chartCard: { marginBottom: spacing.xs, alignItems: 'center' },
  compositionCard: { marginBottom: spacing.xs },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: typography.sizes.xs },
  legendPct: { fontSize: typography.sizes.xs },
  recordsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  entryItem: { fontSize: typography.sizes.sm, fontWeight: '500', lineHeight: 18 },
  entryDate: { fontSize: typography.sizes.xs, marginTop: 2 },
  entryValue: { fontSize: typography.sizes.sm, marginLeft: spacing.sm },
});
