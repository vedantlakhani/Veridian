import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useMemo, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useDailySummary, useWeeklySummary } from '@/hooks/useSummaries';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAllEmissionFactors } from '@/hooks/useAllEmissionFactors';
import { useTopMoves } from '@/hooks/useTopMoves';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { useMotionDetection } from '@/hooks/useMotionDetection';
import { useAutoLog } from '@/hooks/useAutoLog';
import type { AutoLogEntry } from '@/hooks/useAutoLog';
import { useStreak } from '@/hooks/useStreak';
import { getLocalDateString } from '@/lib/emissions';
import { supabase } from '@/lib/supabase';
import {
  VSkeleton,
  VAiInsightCard,
  VText,
  VIcon,
  VCountUp,
  VPressable,
  VProgressRing,
  VStaggerIn,
  VTopMovesSection,
} from '@/components/ui';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import type { EmissionCategory } from '@/types/emission';
import {
  colors,
  spacing,
  typography,
  radii,
  motion,
  shadows,
  budgetStateFor,
  budgetStateColors,
  type BudgetState,
} from '@/lib/theme';
import { useAiInsight } from '@/hooks/useAiInsight';
import type { EmissionContext } from '@/hooks/useAiInsight';
import { resolveFirstName, formatKgCompact, timeGreeting, timeAgo } from '@/lib/format';

// ─── Category colors ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  food: colors.food,
  transport: colors.transport,
  energy: colors.energy,
};

const CATEGORY_GLOWS: Record<EmissionCategory, string> = {
  food: colors.foodGlow,
  transport: colors.transportGlow,
  energy: colors.energyGlow,
};


// ─── The Ring — single source of truth, flips to reveal the category split ───
function BudgetRingHero({
  todayKg,
  state,
  split,
}: {
  todayKg: number;
  state: BudgetState;
  split: { food: number; transport: number; energy: number };
}) {
  const flip = useSharedValue(0);
  const progress = Math.min(todayKg / DAILY_CARBON_BUDGET_KG, 1);
  const stateStyle = budgetStateColors[state];

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flip.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flip.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  const toggleFlip = () => {
    flip.value = withSpring(flip.value > 0.5 ? 0 : 1, motion.springGentle);
  };

  return (
    <Pressable onPress={toggleFlip} accessibilityRole="button" accessibilityLabel="Budget ring — tap to see category split">
      <View style={ringStyles.stack}>
        {/* Front — the one big ring */}
        <Animated.View style={[ringStyles.face, frontStyle]}>
          <VProgressRing
            progress={progress}
            size={200}
            strokeWidth={14}
            gradient={stateStyle.ring}
            animationDuration={900}
          >
            <View style={ringStyles.center}>
              <VCountUp value={todayKg} decimals={1} duration={900} style={ringStyles.bigNumber} />
              <VText variant="label" style={ringStyles.ringCaption}>
                {`of ${DAILY_CARBON_BUDGET_KG} kg`}
              </VText>
            </View>
          </VProgressRing>
        </Animated.View>

        {/* Back — today's category split as three mini arcs */}
        <Animated.View style={[ringStyles.face, ringStyles.backFace, backStyle]}>
          {(
            [
              { key: 'food' as const, label: 'Food', value: split.food },
              { key: 'transport' as const, label: 'Move', value: split.transport },
              { key: 'energy' as const, label: 'Power', value: split.energy },
            ]
          ).map(({ key, label, value }) => (
            <View key={key} style={ringStyles.miniWrap}>
              <VProgressRing
                progress={todayKg > 0 ? value / todayKg : 0}
                size={56}
                strokeWidth={5}
                color={CATEGORY_COLORS[key]}
              >
                <VText variant="mono" style={ringStyles.miniValue}>
                  {value.toFixed(1)}
                </VText>
              </VProgressRing>
              <VText variant="label" style={ringStyles.miniLabel}>
                {label}
              </VText>
            </View>
          ))}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const ringStyles = StyleSheet.create({
  stack: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFace: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  center: { alignItems: 'center' },
  bigNumber: {
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  ringCaption: {
    marginTop: 2,
    color: colors.textSecondary,
  },
  miniWrap: { alignItems: 'center', gap: spacing.xs },
  miniValue: { fontSize: 11 },
  miniLabel: { fontSize: 9 },
});

// ─── Week strip — 7 day dots colored by that day's budget state ───────────────
function WeekStrip({ days }: { days: { date: string; state: BudgetState | 'empty'; isToday: boolean }[] }) {
  return (
    <VPressable
      onPress={() => router.push('/(tabs)/insights')}
      haptic="light"
      style={weekStyles.row}
      accessibilityRole="button"
      accessibilityLabel="This week — open insights"
    >
      {days.map((d) => (
        <WeekDot key={d.date} state={d.state} isToday={d.isToday} label={d.date} />
      ))}
    </VPressable>
  );
}

function WeekDot({
  state,
  isToday,
  label,
}: {
  state: BudgetState | 'empty';
  isToday: boolean;
  label: string;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isToday) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 900, easing: motion.easeHeartbeat }),
          withTiming(1, { duration: 900, easing: motion.easeHeartbeat }),
        ),
        -1,
        false,
      );
    }
  }, [isToday, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const dotColor =
    state === 'empty' ? colors.trackOnDark : budgetStateColors[state].accent;
  const dayLetter = new Date(label + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'narrow' });

  return (
    <View style={weekStyles.dayCol}>
      <Animated.View
        style={[
          weekStyles.dot,
          { backgroundColor: dotColor },
          isToday && weekStyles.dotToday,
          pulseStyle,
        ]}
      />
      <VText variant="label" style={weekStyles.dayLetter}>
        {dayLetter}
      </VText>
    </View>
  );
}

const weekStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  dayCol: { alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  dotToday: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  dayLetter: { fontSize: 9 },
});

// ─── Live trip card — proof of life while a drive is being detected ──────────
function ActiveTripCard({ currentTripKm }: { currentTripKm: number }) {
  const cardOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: motion.timingBase });
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 750, easing: motion.easeHeartbeat }),
        withTiming(1, { duration: 750, easing: motion.easeHeartbeat }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 750, easing: motion.easeHeartbeat }),
        withTiming(1, { duration: 750, easing: motion.easeHeartbeat }),
      ),
      -1,
      false,
    );
  }, [cardOpacity, pulseScale, pulseOpacity]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View style={[tripStyles.card, cardStyle]}>
      <VIcon name="car" size={24} color={colors.transport} />
      <View style={{ flex: 1 }}>
        <View style={tripStyles.titleRow}>
          <VText variant="heading" style={tripStyles.title}>
            Trip in progress
          </VText>
          <Animated.View style={[tripStyles.liveDot, pulseStyle]} />
        </View>
        <View style={tripStyles.kmRow}>
          <VCountUp value={currentTripKm} decimals={1} duration={500} style={tripStyles.km} />
          <VText variant="caption" style={tripStyles.subtitle}>
            km · Veridian will log this when you stop
          </VText>
        </View>
      </View>
    </Animated.View>
  );
}

const tripStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.transport,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { fontSize: 15 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.transport,
  },
  kmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: 2,
  },
  km: {
    fontSize: 18,
    color: colors.transport,
  },
  subtitle: { fontSize: 12 },
});

// ─── Auto-log feed row ("Tracked for you") ────────────────────────────────────
function AutoLogRow({ entry }: { entry: AutoLogEntry }) {
  const cycling = entry.mode === 'cycling';

  return (
    <View
      style={[
        autoStyles.card,
        cycling
          ? { borderColor: `${colors.primaryLight}4D`, borderLeftColor: colors.primaryLight }
          : { borderColor: colors.border, borderLeftColor: colors.transport },
      ]}
    >
      {cycling && (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.primaryGlowSoft }]}
          pointerEvents="none"
        />
      )}
      <VIcon
        name={cycling ? 'bike' : 'car'}
        size={20}
        color={cycling ? colors.primaryLight : colors.transport}
      />
      <View style={{ flex: 1 }}>
        <VText
          variant="body"
          style={[autoStyles.title, cycling && { color: colors.primaryLight }]}
          numberOfLines={1}
        >
          {entry.distanceKm.toFixed(1)} km {cycling ? 'cycled' : 'drive'}
        </VText>
        <VText variant="caption" style={autoStyles.subtitle} numberOfLines={1}>
          {cycling
            ? `You saved ${entry.savedKg.toFixed(1)} kg vs driving`
            : timeAgo(entry.loggedAt)}
        </VText>
      </View>
      <VText
        variant="mono"
        style={[autoStyles.value, { color: cycling ? colors.primaryLight : colors.transport }]}
      >
        {cycling ? `−${entry.savedKg.toFixed(1)} kg` : `${entry.kgCo2e.toFixed(2)} kg`}
      </VText>
    </View>
  );
}

const autoStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    ...shadows.card,
    borderWidth: 1,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    padding: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  title: { fontWeight: '500', lineHeight: 18 },
  subtitle: { fontSize: 12, marginTop: 1 },
  value: { fontSize: 13 },
});

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  const { data: profile } = useProfile(user?.id);
  const { data: daily } = useDailySummary(user?.id);
  const { data: weekly } = useWeeklySummary(user?.id);
  const { data: recentEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);

  // Passive intelligence: live trip status + auto-logged activity feed
  const { isInMotion, currentTripKm } = useMotionDetection();
  const { recentAutoLogs } = useAutoLog(user?.id);

  // Shared streak hook — no more duplicated logic with Profile
  const { streak } = useStreak(user?.id);

  // Top Moves — pure client-side ranking over already-fetched data
  const { data: allFactors } = useAllEmissionFactors();
  const weeklyTotalKg = weekly?.total_kg_co2e ?? null;
  const moves = useTopMoves(recentEntries, allFactors, weeklyTotalKg);

  // Last 7 days of daily summaries — powers the week strip and pace coach
  const { data: weekDays } = useQuery({
    queryKey: ['week_strip', user?.id, today],
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      const fromStr = getLocalDateString(from);
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('date, total_kg_co2e')
        .eq('user_id', user!.id)
        .gte('date', fromStr)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as { date: string; total_kg_co2e: number }[];
    },
    enabled: !!user?.id,
  });

  const todayTotal = daily?.total_kg_co2e ?? 0;
  const progress = todayTotal / DAILY_CARBON_BUDGET_KG;
  const state = budgetStateFor(progress);
  const remaining = DAILY_CARBON_BUDGET_KG - todayTotal;

  const split = {
    food: daily?.food_kg ?? 0,
    transport: daily?.transport_kg ?? 0,
    energy: daily?.energy_kg ?? 0,
  };

  // Week strip — one slot per day, today last
  const weekStrip = useMemo(() => {
    const byDate = new Map((weekDays ?? []).map((d) => [d.date, d.total_kg_co2e]));
    const out: { date: string; state: BudgetState | 'empty'; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      const kg = byDate.get(key);
      out.push({
        date: key,
        state: kg === undefined ? 'empty' : budgetStateFor(kg / DAILY_CARBON_BUDGET_KG),
        isToday: key === today,
      });
    }
    return out;
  }, [weekDays, today]);

  // Pace-aware coach voice — derived from daily summaries, no AI call needed
  const coach = useMemo(() => {
    const pastDays = (weekDays ?? []).filter((d) => d.date !== today);
    const avg =
      pastDays.length > 0
        ? pastDays.reduce((s, d) => s + d.total_kg_co2e, 0) / pastDays.length
        : null;

    if (todayTotal === 0) {
      return { line: 'A fresh day — nothing logged yet.', color: colors.textSecondary };
    }
    if (state === 'over') {
      return { line: 'Over budget today. Tomorrow resets.', color: colors.danger };
    }
    if (avg !== null && pastDays.length >= 2) {
      const best = Math.min(...pastDays.map((d) => d.total_kg_co2e));
      if (todayTotal < best) {
        return { line: 'On pace for your best day this week.', color: colors.primaryLight };
      }
      if (todayTotal < avg) {
        return {
          line: `Trending under your ${formatKgCompact(avg)} daily average.`,
          color: colors.primaryLight,
        };
      }
    }
    if (state === 'watch') {
      return {
        line: `${formatKgCompact(Math.max(remaining, 0))} left — log mindfully.`,
        color: colors.warning,
      };
    }
    return {
      line: `${formatKgCompact(Math.max(remaining, 0))} remaining in your budget.`,
      color: colors.primaryLight,
    };
  }, [weekDays, today, todayTotal, state, remaining]);

  const firstName = resolveFirstName(profile?.display_name, user?.email);
  const greeting = `${timeGreeting()}, ${firstName}`;

  // When Top Moves are available, skip the AI Edge Function entirely (saves the Claude call).
  // Pass null context so useAiInsight's `enabled` gate stays false.
  const emissionContext: EmissionContext | null =
    moves.length > 0
      ? null
      : weekly && recentEntries.length > 0
        ? {
            weeklyTotalKg: weekly.total_kg_co2e,
            foodKg: weekly.breakdown?.food ?? 0,
            transportKg: weekly.breakdown?.transport ?? 0,
            energyKg: weekly.breakdown?.energy ?? 0,
            topItems: [...recentEntries]
              .sort((a, b) => b.kg_co2e_total - a.kg_co2e_total)
              .slice(0, 3)
              .map((e) => ({
                item: e.emission_factors.item,
                category: e.emission_factors.category,
                totalKg: e.kg_co2e_total,
              })),
          }
        : null;

  const {
    data: insight,
    isLoading: insightLoading,
    error: insightError,
    refetch: refetchInsight,
  } = useAiInsight(user?.id, emissionContext);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Hero: nature photo + ring ── */}
      <View style={styles.heroOuter}>
        <Image
          source={require('@/assets/images/hero-forest.jpg')}
          style={styles.heroPhoto}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(245,247,243,0.18)', 'rgba(245,247,243,0.82)', 'rgba(245,247,243,1.0)']}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <SafeAreaView style={styles.heroContainer} edges={['top']}>
          <View style={styles.heroContent}>
          {/* Greeting + streak flame chip */}
          <View style={styles.topRow}>
            <VText variant="heading" style={styles.greeting} numberOfLines={1}>
              {greeting}
            </VText>
            {streak > 0 && (
              <View style={[styles.streakPill, streak >= 3 && styles.streakPillHot]}>
                <VIcon name="flame" size={13} color={colors.warning} strokeWidth={2} />
                <VText variant="mono" style={styles.streakPillText}>
                  {streak}
                </VText>
              </View>
            )}
          </View>

          {/* The Ring — single source of truth */}
          <View style={styles.ringWrapper}>
            <BudgetRingHero todayKg={todayTotal} state={state} split={split} />
          </View>

          {/* Coach voice */}
          <VText variant="body" style={[styles.coachLine, { color: coach.color }]}>
            {coach.line}
          </VText>

          {/* Week strip */}
          <WeekStrip days={weekStrip} />
        </View>
        </SafeAreaView>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live trip — the app's most magical proof-of-life */}
        {isInMotion && <ActiveTripCard currentTripKm={currentTripKm} />}

        {/* Tracked for you */}
        {recentAutoLogs.length > 0 && (
          <View style={styles.trackedSection}>
            <VText variant="label" style={styles.sectionLabel}>
              Tracked for you
            </VText>
            <VText variant="caption" style={styles.sectionSub}>
              {"Veridian logged this so you didn't have to."}
            </VText>
            {recentAutoLogs.slice(0, 3).map((autoEntry) => (
              <AutoLogRow key={autoEntry.tripId} entry={autoEntry} />
            ))}
          </View>
        )}

        {/* Top Moves (ranked personal impact) or AI Insight fallback */}
        {moves.length > 0 ? (
          <VTopMovesSection moves={moves} />
        ) : (
          <View style={styles.insightWrap}>
            <VAiInsightCard
              insight={insight}
              isLoading={insightLoading}
              error={insightError}
              onRetry={() => void refetchInsight()}
            />
          </View>
        )}

        {/* Recent */}
        <View style={styles.recentHeader}>
          <VText variant="label" style={styles.sectionLabel}>
            Recent
          </VText>
          <VPressable
            onPress={() => router.push('/(tabs)/insights')}
            haptic="light"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View all entries"
          >
            <View style={styles.viewAllRow}>
              <VText variant="caption" style={styles.recentLink}>
                View all
              </VText>
              <VIcon name="chevron-right" size={12} color={colors.primaryLight} strokeWidth={2.25} />
            </View>
          </VPressable>
        </View>

        {entriesLoading ? (
          <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
            <VSkeleton width="100%" height={56} />
            <VSkeleton width="100%" height={56} />
          </View>
        ) : recentEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <VText variant="heading" style={styles.emptyTitle}>
              Nothing logged yet.
            </VText>
            <VText variant="caption" style={styles.emptyBody}>
              Start with the most common things — a meal, your commute, or home energy.
            </VText>
            <VPressable
              onPress={() => router.push('/(tabs)/log')}
              haptic="light"
              hitSlop={8}
              style={styles.emptyCta}
            >
              <VText variant="caption" style={styles.emptyCtaText}>
                Quick Log
              </VText>
              <VIcon name="arrow-right" size={12} color={colors.primaryLight} strokeWidth={2.25} />
            </VPressable>
          </View>
        ) : (
          recentEntries.slice(0, 5).map((entry, i) => {
            const cat = entry.emission_factors.category as EmissionCategory;
            const dotColor = CATEGORY_COLORS[cat] ?? colors.primary;
            const glowColor = CATEGORY_GLOWS[cat] ?? colors.primaryGlowSoft;
            return (
              <VStaggerIn key={entry.id} index={i}>
                <View style={[styles.entryCard, { borderLeftColor: dotColor }]}>
                  <View
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: glowColor }]}
                    pointerEvents="none"
                  />
                  <View style={styles.entryRow}>
                    <View style={styles.entryLeft}>
                      <View style={[styles.entryDot, { backgroundColor: dotColor }]} />
                      <VText variant="body" style={styles.entryItem} numberOfLines={1}>
                        {entry.emission_factors.item}
                      </VText>
                    </View>
                    <VText variant="mono" style={styles.entryValue}>
                      {entry.kg_co2e_total.toFixed(2)} kg
                    </VText>
                  </View>
                </View>
              </VStaggerIn>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroOuter: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroPhoto: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  heroContainer: {
    backgroundColor: 'transparent',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 17,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,181,71,0.12)',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  streakPillHot: {
    backgroundColor: 'rgba(255,181,71,0.2)',
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  streakPillText: {
    fontSize: 12,
    color: colors.warning,
  },
  ringWrapper: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  coachLine: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  scrollContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  trackedSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
  },
  sectionSub: {
    fontSize: 11,
    paddingHorizontal: spacing.md,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  insightWrap: {
    paddingHorizontal: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recentLink: {
    fontWeight: '600',
    color: colors.primaryLight,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
  },
  emptyBody: {
    marginTop: 4,
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  emptyCtaText: {
    fontWeight: '600',
    color: colors.primaryLight,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
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
  entryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryItem: {
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  entryValue: {
    fontSize: typography.sizes.md,
  },
});
