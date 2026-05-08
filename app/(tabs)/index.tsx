import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMemo } from 'react';
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useWeeklySummary } from '@/hooks/useSummaries';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { getLocalDateString } from '@/lib/emissions';
import { supabase } from '@/lib/supabase';
import {
  VCard,
  VSkeleton,
  VEmptyState,
  VAiInsightCard,
} from '@/components/ui';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import type { EmissionCategory } from '@/types/emission';
import { colors, spacing, typography, radii } from '@/lib/theme';
import { useAiInsight } from '@/hooks/useAiInsight';
import type { EmissionContext } from '@/hooks/useAiInsight';
import {
  resolveFirstName,
  formatKgCompact,
  timeGreeting,
} from '@/lib/format';

const HERO_IMAGES = [
  require('@/assets/images/hero-forest.jpg'),
  require('@/assets/images/hero-ocean.jpg'),
  require('@/assets/images/hero-mountain.jpg'),
  require('@/assets/images/hero-field.jpg'),
  require('@/assets/images/hero-sky.jpg'),
];

const todayPhoto = HERO_IMAGES[new Date().getDay() % HERO_IMAGES.length];

// ─── Budget Ring ──────────────────────────────────────────────────────────────
const RING_SIZE = 200;
const STROKE = 14;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function BudgetRing({ progress }: { progress: number }) {
  const clamped = Math.min(progress, 1);
  const offset = CIRCUMFERENCE * (1 - clamped);
  const ringColor =
    clamped >= 1 ? colors.danger : clamped >= 0.5 ? colors.warning : colors.primaryLight;

  return (
    <Svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      {/* Track */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={STROKE}
        fill="none"
      />
      {/* Progress arc */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke={ringColor}
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Category dot color helper ────────────────────────────────────────────────
const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  food: colors.food,
  transport: colors.transport,
  energy: colors.energy,
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  const { data: profile } = useProfile(user?.id);
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySummary(user?.id);
  const { data: recentEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);

  // ── Streak: consecutive logged days from daily_summaries ──
  const { data: streakData } = useQuery({
    queryKey: ['streak', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('date')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as { date: string }[];
    },
    enabled: !!user?.id,
  });

  const streak = useMemo(() => {
    if (!streakData || streakData.length === 0) return 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let s = 0;
    const check = new Date(todayDate);
    for (const row of streakData) {
      const d = new Date(row.date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === check.getTime()) {
        s++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return s;
  }, [streakData]);

  const todayTotal = recentEntries
    .filter(e => getLocalDateString(new Date(e.logged_at)) === today)
    .reduce((sum, e) => sum + e.kg_co2e_total, 0);

  const progress = Math.min(todayTotal / DAILY_CARBON_BUDGET_KG, 1);
  const ringColor =
    progress >= 1 ? colors.danger : progress >= 0.5 ? colors.warning : colors.primaryLight;

  const firstName = resolveFirstName(profile?.display_name, user?.email);
  const greeting = `${timeGreeting()}, ${firstName}.`;

  // Status sentence (no hashtag)
  let statusLabel: string;
  if (todayTotal === 0) {
    statusLabel = 'Getting started';
  } else if (progress < 0.5) {
    statusLabel = 'On track';
  } else if (progress < 1) {
    statusLabel = 'Getting close';
  } else {
    statusLabel = 'Over budget';
  }

  const remaining = DAILY_CARBON_BUDGET_KG - todayTotal;

  const emissionContext: EmissionContext | null =
    weekly && recentEntries.length > 0
      ? {
          weeklyTotalKg: weekly.total_kg_co2e,
          foodKg: weekly.breakdown?.food ?? 0,
          transportKg: weekly.breakdown?.transport ?? 0,
          energyKg: weekly.breakdown?.energy ?? 0,
          topItems: [...recentEntries]
            .sort((a, b) => b.kg_co2e_total - a.kg_co2e_total)
            .slice(0, 3)
            .map(e => ({
              item: e.emission_factors.item,
              category: e.emission_factors.category,
              totalKg: e.kg_co2e_total,
            })),
        }
      : null;

  const { data: insight, isLoading: insightLoading, error: insightError } = useAiInsight(
    user?.id,
    emissionContext,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Hero: full-bleed photo + ring ── */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={todayPhoto}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        {/* Refined dark scrim */}
        <LinearGradient
          colors={['rgba(11,15,13,0.75)', 'rgba(11,15,13,0.1)', 'rgba(11,15,13,0.7)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Bottom fade into app background */}
        <LinearGradient
          colors={['transparent', colors.background]}
          locations={[0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.heroContent} edges={['top']}>
          {/* ── Top row: greeting + streak pill ── */}
          <View style={styles.topRow}>
            <Text style={styles.greeting} numberOfLines={1}>{greeting}</Text>
            {streak > 0 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakPillText}>{`🔥 ${streak} day streak`}</Text>
              </View>
            )}
          </View>

          {/* Ring — centered */}
          <View style={styles.ringWrapper}>
            <BudgetRing progress={progress} />
            {/* Inner text overlay — kg today, not percent */}
            <View style={styles.ringCenter}>
              <Text style={styles.ringNumber}>
                {todayTotal.toFixed(1)}
              </Text>
              <Text style={styles.ringSubLabel}>KG TODAY</Text>
            </View>
          </View>

          {/* Status sentence — colored, no hashtag */}
          <Text style={[styles.statusLabel, { color: ringColor }]}>
            {statusLabel}
          </Text>
          <Text style={styles.todayKg}>
            {`${formatKgCompact(todayTotal)} of ${DAILY_CARBON_BUDGET_KG} kg budget`}
          </Text>
        </SafeAreaView>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Data card — overlaps hero with negative top margin */}
        <VCard elevation="lg" style={styles.dataCard}>
          <View style={styles.dataRow}>
            <View style={styles.dataCol}>
              <Text style={styles.dataNumber}>{todayTotal.toFixed(1)}</Text>
              <Text style={styles.dataLabel}>KG TODAY</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataCol}>
              <Text style={styles.dataNumber}>
                {(weekly?.total_kg_co2e ?? 0).toFixed(1)}
              </Text>
              <Text style={styles.dataLabel}>THIS WEEK</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataCol}>
              <Text
                style={[
                  styles.dataNumber,
                  { color: remaining < 0 ? colors.danger : colors.primaryLight },
                ]}
              >
                {(remaining > 0 ? remaining : 0).toFixed(1)}
              </Text>
              <Text style={styles.dataLabel}>REMAINING</Text>
            </View>
          </View>

          {/* Category bars */}
          {!weeklyLoading && (
            <View style={styles.barsSection}>
              <ProgressBar
                label="Food"
                value={weekly?.breakdown?.food ?? 0}
                max={DAILY_CARBON_BUDGET_KG * 7}
                color={colors.food}
              />
              <ProgressBar
                label="Transport"
                value={weekly?.breakdown?.transport ?? 0}
                max={DAILY_CARBON_BUDGET_KG * 7}
                color={colors.transport}
              />
              <ProgressBar
                label="Energy"
                value={weekly?.breakdown?.energy ?? 0}
                max={DAILY_CARBON_BUDGET_KG * 7}
                color={colors.energy}
              />
            </View>
          )}
        </VCard>

        {/* AI Insight */}
        <VAiInsightCard insight={insight} isLoading={insightLoading} error={insightError} />

        {/* Recent entries section */}
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>RECENT</Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.recentLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        {entriesLoading ? (
          <>
            <View style={{ marginBottom: spacing.sm }}><VSkeleton width="100%" height={56} /></View>
            <View style={{ marginBottom: spacing.sm }}><VSkeleton width="100%" height={56} /></View>
          </>
        ) : recentEntries.length === 0 ? (
          <VEmptyState title="No entries yet" body="Tap Log to record your first emission" />
        ) : (
          recentEntries.slice(0, 5).map((entry) => {
            const cat = entry.emission_factors.category as EmissionCategory;
            const dotColor = CATEGORY_COLORS[cat] ?? colors.primary;
            return (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <View style={styles.entryLeft}>
                    <View style={[styles.entryDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.entryItem} numberOfLines={1}>
                      {entry.emission_factors.item}
                    </Text>
                  </View>
                  <Text style={styles.entryValue}>
                    {entry.kg_co2e_total.toFixed(2)} kg
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function ProgressBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${pct * 100}%` as `${number}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={barStyles.value}>{formatKgCompact(value)}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 76,
    fontWeight: '500',
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  value: {
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 56,
    textAlign: 'right',
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  heroContainer: {
    height: 420,
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Top row: greeting + streak
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(242,245,243,0.85)',
    flexShrink: 1,
  },
  streakPill: {
    backgroundColor: 'rgba(255,181,71,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  streakPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 0.2,
  },

  // Ring
  ringWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringNumber: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  ringSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(242,245,243,0.5)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Status under ring
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  todayKg: {
    fontSize: 12,
    color: 'rgba(242,245,243,0.65)',
    fontWeight: '500',
  },

  // Scroll content
  scrollContent: {
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },

  // Data card overlaps hero
  dataCard: {
    marginHorizontal: spacing.md,
    marginTop: -24,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dataCol: {
    flex: 1,
    alignItems: 'center',
  },
  dataDivider: {
    width: StyleSheet.hairlineWidth,
    height: '60%',
    backgroundColor: colors.border,
  },
  dataNumber: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  dataLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: 4,
  },
  barsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },

  // Recent entries section
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  recentTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  recentLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },

  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  entryValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
