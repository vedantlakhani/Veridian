import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useMemo, useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  interpolate,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useDailySummary, useWeeklySummary } from '@/hooks/useSummaries';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAllEmissionFactors } from '@/hooks/useAllEmissionFactors';
import { useTopMoves } from '@/hooks/useTopMoves';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { useTripsContext } from '@/contexts/TripsContext';
import { useStreak } from '@/hooks/useStreak';
import { getLocalDateString } from '@/lib/emissions';
import { CAR_KG_PER_KM } from '@/lib/tripEngine';
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
  VBottomSheet,
  VEmptyState,
  VChip,
  type VIconName,
} from '@/components/ui';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import type { EmissionCategory, DetectedTrip, TripMode } from '@/types/emission';
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
import { resolveFirstName, timeGreeting } from '@/lib/format';
import {
  buildFeedSentence,
  buildImpactChip,
  buildTripConfirmSentence,
  formatClockTime,
  formatKgChip,
  type FeedItem,
} from '@/lib/feedCopy';

// hooks/useTrips.ts returns the full (up to AUTO_CONFIRMED_SCAN_LIMIT)
// auto_confirmed list, unsliced, so a car trip can never evict a same-day
// walk/cycling trip before this screen gets to filter by mode/day. This is
// the display cap instead, applied AFTER that filter — same visual density
// the feed had when the hook itself capped at 5.
const MAX_FEED_TRIPS = 5;

// ─── Category colors ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  food: colors.food,
  transport: colors.transport,
  energy: colors.energy,
  shopping: colors.shopping,
};

// One quiet, efficacy-first line under the ring — never red-as-shame; the "over"
// copy points forward, not down (NORTH_STAR.md §8.4 anti-guilt).
const EFFICACY_COPY: Record<BudgetState, string> = {
  calm: 'Plenty of headroom today',
  watch: 'Tracking a touch high — one light choice keeps you in band',
  over: "Over today's band — tomorrow's a fresh start",
};

// ─── The Ring — hero anchor; flips to reveal today's category split ──────────
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
    <Pressable onPress={toggleFlip} accessibilityRole="button" accessibilityLabel="Today's footprint — tap to see the category split">
      <View style={ringStyles.stack}>
        {/* Front — the one big ring */}
        <Animated.View style={[ringStyles.face, frontStyle]}>
          <VProgressRing
            progress={progress}
            size={224}
            strokeWidth={15}
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
                size={60}
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
    width: 224,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    width: 224,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFace: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  center: { alignItems: 'center' },
  bigNumber: {
    fontSize: 52,
    lineHeight: 58,
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

// ─── Feed row — icon · plain-language sentence · impact chip ───────────────────
type FeedRowItem = FeedItem & { id: string };

function feedIcon(item: FeedItem): { name: VIconName; color: string } {
  if (item.kind === 'trip') {
    return item.mode === 'cycling'
      ? { name: 'bike', color: colors.primaryLight }
      : { name: 'walk', color: colors.primaryLight };
  }
  switch (item.category) {
    case 'food':
      return { name: 'fork', color: colors.food };
    case 'energy':
      return { name: 'bolt', color: colors.energy };
    case 'shopping':
      return { name: 'sparkle', color: colors.shopping };
    default:
      return { name: 'car', color: colors.transport };
  }
}

function ImpactPill({ label, positive }: { label: string; positive: boolean }) {
  if (positive) {
    return (
      <View style={feedStyles.savedChip}>
        <VText variant="caption" style={feedStyles.savedChipText}>
          {label}
        </VText>
      </View>
    );
  }
  return (
    <VText variant="mono" style={feedStyles.kgText}>
      {label}
    </VText>
  );
}

function FeedRow({ item, index }: { item: FeedRowItem; index: number }) {
  const { name, color } = feedIcon(item);
  const sentence = buildFeedSentence(item);
  const chip = buildImpactChip(item);

  return (
    <VStaggerIn index={index}>
      <View style={[feedStyles.row, chip.positive && feedStyles.rowPositive]}>
        {chip.positive && (
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.primaryGlowSoft }]}
            pointerEvents="none"
          />
        )}
        <View style={[feedStyles.iconWrap, { backgroundColor: `${color}14` }]}>
          <VIcon name={name} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <VText variant="body" style={feedStyles.sentence} numberOfLines={2}>
            {sentence}
          </VText>
          <VText variant="caption" style={feedStyles.time}>
            {formatClockTime(item.at)}
          </VText>
        </View>
        <ImpactPill label={chip.label} positive={chip.positive} />
      </View>
    </VStaggerIn>
  );
}

const feedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
  },
  rowPositive: {
    borderColor: `${colors.primaryLight}33`,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentence: {
    fontWeight: '500',
    lineHeight: 19,
  },
  time: {
    fontSize: 12,
    marginTop: 1,
  },
  kgText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  savedChip: {
    backgroundColor: colors.successGlow,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  savedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});

// ─── Confirm review — one card at a time inside a bottom sheet ────────────────
const REVIEW_MODES: { mode: TripMode; label: string; icon?: VIconName }[] = [
  { mode: 'car', label: 'Car', icon: 'car' },
  { mode: 'bus', label: 'Bus' },
  { mode: 'train', label: 'Train' },
  { mode: 'cycling', label: 'Bike', icon: 'bike' },
  { mode: 'walk', label: 'Walk', icon: 'walk' },
];

function ConfirmCard({
  trip,
  index,
  total,
  onConfirm,
  onDismiss,
}: {
  trip: DetectedTrip;
  index: number;
  total: number;
  onConfirm: (trip: DetectedTrip, mode?: TripMode) => void;
  onDismiss: (trip: DetectedTrip) => void;
}) {
  const zero = trip.mode === 'walk' || trip.mode === 'cycling';
  const sentence = buildTripConfirmSentence({
    mode: trip.mode,
    distanceKm: trip.distance_km,
    startedAt: new Date(trip.started_at),
  });
  const estimate = trip.distance_km * CAR_KG_PER_KM;

  return (
    <Animated.View
      key={trip.id}
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(140)}
      layout={LinearTransition.springify()}
      style={reviewStyles.card}
    >
      <VText variant="label" style={reviewStyles.counter}>
        {`${index + 1} of ${total}`}
      </VText>
      <VText variant="heading" style={reviewStyles.sentence}>
        {sentence}
      </VText>
      <VText variant="caption" style={reviewStyles.hint}>
        {zero
          ? `Zero emissions — you saved ${formatKgChip(estimate)} vs driving.`
          : `Roughly ${formatKgChip(estimate)} if we log it as a drive.`}
      </VText>

      <VPressable
        onPress={() => onConfirm(trip)}
        haptic="light"
        style={reviewStyles.primary}
        accessibilityRole="button"
        accessibilityLabel={`Confirm: ${sentence}`}
      >
        <VIcon name="check" size={18} color="#FFFFFF" strokeWidth={2.5} />
        <VText style={reviewStyles.primaryText}>{zero ? 'Yes — nice one' : "Yes, that's right"}</VText>
      </VPressable>

      <VText variant="label" style={reviewStyles.orLabel}>
        Or set the mode
      </VText>
      <View style={reviewStyles.chipRow}>
        {REVIEW_MODES.map((m) => (
          <VChip
            key={m.mode}
            label={m.label}
            icon={m.icon}
            selected={m.mode === trip.mode}
            onPress={() => onConfirm(trip, m.mode)}
          />
        ))}
      </View>

      <VPressable
        onPress={() => onDismiss(trip)}
        haptic="light"
        hitSlop={8}
        style={reviewStyles.notTrip}
        accessibilityRole="button"
        accessibilityLabel="Not a trip — dismiss"
      >
        <VText variant="caption" style={reviewStyles.notTripText}>
          Not a trip
        </VText>
      </VPressable>
    </Animated.View>
  );
}

function ReviewAllDone() {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={reviewStyles.done}>
      <View style={reviewStyles.doneCircle}>
        <VIcon name="check" size={30} color={colors.primary} strokeWidth={2.5} />
      </View>
      <VText variant="heading" style={reviewStyles.doneTitle}>
        All caught up
      </VText>
      <VText variant="caption" style={reviewStyles.doneBody}>
        Thanks — that keeps your footprint honest.
      </VText>
    </Animated.View>
  );
}

const reviewStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  counter: {
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  sentence: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  hint: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    minHeight: 54,
    ...shadows.glowPrimary,
  },
  primaryText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  notTrip: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  notTripText: {
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  done: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  doneCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.successGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  doneTitle: { fontSize: typography.sizes.lg },
  doneBody: { marginTop: spacing.xs, textAlign: 'center' },
});

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  const { data: profile } = useProfile(user?.id);
  const { data: daily } = useDailySummary(user?.id);
  const { data: weekly } = useWeeklySummary(user?.id);

  // Broad entries power Top Moves + the AI fallback (windowing happens inside
  // those); today-scoped entries power the "Today" feed.
  const { data: allEntries = [] } = useEmissionEntries(user?.id);
  const { data: todayEntries = [], isLoading: todayLoading } = useEmissionEntries(user?.id, today, today);

  // Passive intelligence: live trip status, the daily review queue, and the
  // auto-logged activity feed (single pipeline mounted by TripsProvider).
  const { isInMotion, currentTripKm, recentAutoLogs, needsConfirmation, confirmTrip, dismissTrip } =
    useTripsContext();

  const { streak } = useStreak(user?.id);

  // Top Moves — pure client-side ranking over already-fetched data
  const { data: allFactors } = useAllEmissionFactors();
  const weeklyTotalKg = weekly?.total_kg_co2e ?? null;
  const moves = useTopMoves(allEntries, allFactors, weeklyTotalKg);

  // Last 7 days of daily summaries — powers the week strip
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

  const split = {
    food: daily?.food_kg ?? 0,
    transport: daily?.transport_kg ?? 0,
    energy: daily?.energy_kg ?? 0,
  };

  // ── The "Today" feed — today's emission entries + today's zero-emission
  // auto-confirmed trips (walk/cycling), merged reverse-chron. Car trips already
  // surface as their linked sensor entries, so only the celebration trips are
  // pulled from recentAutoLogs to avoid double-counting. ──
  const feedItems = useMemo<FeedRowItem[]>(() => {
    const items: FeedRowItem[] = [];
    for (const e of todayEntries) {
      items.push({
        id: `entry:${e.id}`,
        kind: 'entry',
        item: e.emission_factors.item,
        subcategory: e.emission_factors.subcategory,
        category: e.emission_factors.category,
        unit: e.emission_factors.unit,
        quantity: e.quantity,
        kgCo2e: e.kg_co2e_total,
        at: new Date(e.logged_at),
      });
    }
    const todayTripLogs = recentAutoLogs
      .filter((a) => (a.mode === 'walk' || a.mode === 'cycling') && getLocalDateString(a.loggedAt) === today)
      .slice(0, MAX_FEED_TRIPS);
    for (const a of todayTripLogs) {
      items.push({
        id: `trip:${a.tripId}`,
        kind: 'trip',
        mode: a.mode,
        distanceKm: a.distanceKm,
        savedKg: a.savedKg,
        at: a.loggedAt,
      });
    }
    items.sort((x, y) => y.at.getTime() - x.at.getTime());
    return items;
  }, [todayEntries, recentAutoLogs, today]);

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

  const firstName = resolveFirstName(profile?.display_name, user?.email);
  const greeting = `${timeGreeting()}, ${firstName}`;

  // ── Daily review — page one confirm card at a time. The queue is snapshotted
  // on open so live query invalidations don't reshuffle the index mid-review. ──
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<DetectedTrip[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openReview = () => {
    setReviewQueue(needsConfirmation);
    setReviewIndex(0);
    setReviewDone(false);
    setReviewOpen(true);
  };

  const advanceReview = () => {
    setReviewIndex((i) => {
      const next = i + 1;
      if (next >= reviewQueue.length) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setReviewDone(true);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setReviewOpen(false), 1100);
        return i;
      }
      return next;
    });
  };

  const handleReviewConfirm = (trip: DetectedTrip, mode?: TripMode) => {
    void confirmTrip(trip, mode).catch(() => {
      // Best-effort: a failed confirm leaves the trip in needs_confirmation, so
      // the review card reappears next time. We still advance to stay snappy.
    });
    advanceReview();
  };

  const handleReviewDismiss = (trip: DetectedTrip) => {
    void dismissTrip(trip).catch(() => {});
    advanceReview();
  };

  const currentTrip = reviewQueue[reviewIndex];

  // When Top Moves are available, skip the AI Edge Function entirely (saves the
  // Claude call). Pass null context so useAiInsight's `enabled` gate stays false.
  const emissionContext: EmissionContext | null =
    moves.length > 0
      ? null
      : weekly && allEntries.length > 0
        ? {
            weeklyTotalKg: weekly.total_kg_co2e,
            foodKg: weekly.breakdown?.food ?? 0,
            transportKg: weekly.breakdown?.transport ?? 0,
            energyKg: weekly.breakdown?.energy ?? 0,
            topItems: [...allEntries]
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
      {/* ── Hero: nature photo + the ring anchor ── */}
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
                <View
                  style={[styles.streakPill, streak >= 3 && styles.streakPillHot]}
                  accessibilityLabel={`${streak} day streak`}
                >
                  <VIcon name="flame" size={13} color={colors.warning} strokeWidth={2} />
                  <VText variant="mono" style={styles.streakPillText}>
                    {streak}
                  </VText>
                </View>
              )}
            </View>

            {/* The Ring — hero anchor */}
            <View style={styles.ringWrapper}>
              <BudgetRingHero todayKg={todayTotal} state={state} split={split} />
            </View>

            {/* One quiet, efficacy-first line */}
            <VText
              variant="body"
              style={[styles.efficacyLine, { color: budgetStateColors[state].accent }]}
            >
              {EFFICACY_COPY[state]}
            </VText>
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

        {/* Daily review entry point */}
        {needsConfirmation.length > 0 && (
          <VPressable
            onPress={openReview}
            haptic="light"
            style={styles.reviewCard}
            accessibilityRole="button"
            accessibilityLabel={`${needsConfirmation.length} ${
              needsConfirmation.length === 1 ? 'moment' : 'moments'
            } to confirm, takes about 10 seconds`}
          >
            <View style={styles.reviewIcon}>
              <VIcon name="sparkle" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <VText variant="body" style={styles.reviewTitle}>
                {`${needsConfirmation.length} ${
                  needsConfirmation.length === 1 ? 'moment' : 'moments'
                } to confirm`}
              </VText>
              <VText variant="caption" style={styles.reviewSub}>
                Takes about 10 seconds
              </VText>
            </View>
            <VIcon name="chevron-right" size={16} color={colors.textSecondary} strokeWidth={2} />
          </VPressable>
        )}

        {/* ── The "Today" feed ── */}
        <VText variant="label" style={styles.feedLabel}>
          Today
        </VText>
        {todayLoading ? (
          <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
            <VSkeleton width="100%" height={60} borderRadius={radii.md} />
            <VSkeleton width="100%" height={60} borderRadius={radii.md} />
          </View>
        ) : feedItems.length === 0 ? (
          <VEmptyState
            icon={<VIcon name="leaf" size={40} color={colors.primaryLight} />}
            title="Your day, auto-written"
            body="Your day writes itself here as you move — take a walk, we'll notice."
            ctaLabel="Add something manually"
            onCta={() => router.push('/(tabs)/log')}
          />
        ) : (
          feedItems.map((item, i) => <FeedRow key={item.id} item={item} index={i} />)
        )}

        {/* Top Moves (ranked personal impact) or AI Insight fallback */}
        {moves.length > 0 ? (
          <View style={styles.belowFeedSection}>
            <VTopMovesSection moves={moves} />
          </View>
        ) : (
          <View style={[styles.insightWrap, styles.belowFeedSection]}>
            <VAiInsightCard
              insight={insight}
              isLoading={insightLoading}
              error={insightError}
              onRetry={() => void refetchInsight()}
            />
          </View>
        )}

        {/* This week — momentum, reflowed below the feed */}
        <View style={styles.weekSection}>
          <VText variant="label" style={styles.weekLabel}>
            This week
          </VText>
          <WeekStrip days={weekStrip} />
        </View>
      </ScrollView>

      {/* ── Daily review sheet — one confirm card at a time ── */}
      <VBottomSheet isOpen={reviewOpen} onClose={() => setReviewOpen(false)} title="Confirm your moves">
        {reviewDone || !currentTrip ? (
          <ReviewAllDone />
        ) : (
          <ConfirmCard
            trip={currentTrip}
            index={reviewIndex}
            total={reviewQueue.length}
            onConfirm={handleReviewConfirm}
            onDismiss={handleReviewDismiss}
          />
        )}
      </VBottomSheet>
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
    paddingBottom: spacing.lg,
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  efficacyLine: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.primaryLight}33`,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadows.card,
  },
  reviewIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: { fontWeight: '700', lineHeight: 18 },
  reviewSub: { fontSize: 12, marginTop: 1 },
  feedLabel: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  belowFeedSection: {
    marginTop: spacing.lg,
  },
  insightWrap: {
    paddingHorizontal: spacing.md,
  },
  weekSection: {
    marginTop: spacing.lg,
  },
  weekLabel: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
