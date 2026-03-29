import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useWeeklySummary } from '@/hooks/useSummaries';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { getLocalDateString } from '@/lib/emissions';
import {
  VCard,
  VSkeleton,
  VEmptyState,
  VBadge,
  VAiInsightCard,
} from '@/components/ui';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import { colors, spacing, typography } from '@/lib/theme';
import { useAiInsight } from '@/hooks/useAiInsight';
import type { EmissionContext } from '@/hooks/useAiInsight';

const HERO_IMAGES = [
  require('@/assets/images/hero-forest.jpg'),
  require('@/assets/images/hero-ocean.jpg'),
  require('@/assets/images/hero-mountain.jpg'),
  require('@/assets/images/hero-field.jpg'),
  require('@/assets/images/hero-sky.jpg'),
];

const todayPhoto = HERO_IMAGES[new Date().getDay() % HERO_IMAGES.length];

// ─── Budget Ring ──────────────────────────────────────────────────────────────
const RING_SIZE = 168;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function BudgetRing({ progress }: { progress: number }) {
  const clamped = Math.min(progress, 1);
  const offset = CIRCUMFERENCE * (1 - clamped);
  const ringColor =
    clamped >= 1 ? '#EF4444' : clamped >= 0.5 ? '#F59E0B' : '#4ADE80';

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
        stroke="rgba(255,255,255,0.18)"
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

export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  const { data: profile } = useProfile(user?.id);
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySummary(user?.id);
  const { data: recentEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);

  const todayTotal = recentEntries
    .filter(e => getLocalDateString(new Date(e.logged_at)) === today)
    .reduce((sum, e) => sum + e.kg_co2e_total, 0);

  const progress = Math.min(todayTotal / DAILY_CARBON_BUDGET_KG, 1);

  const firstName = profile?.display_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';
  const greeting = firstName ? `${firstName}, you are` : 'You are';

  let statusLabel: string;
  let statusColor: string;
  if (todayTotal === 0) {
    statusLabel = 'getting started';
    statusColor = 'rgba(255,255,255,0.7)';
  } else if (progress < 0.5) {
    statusLabel = '#on track';
    statusColor = '#4ADE80';
  } else if (progress < 1) {
    statusLabel = '#near limit';
    statusColor = '#F59E0B';
  } else {
    statusLabel = '#over budget';
    statusColor = '#EF4444';
  }

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
        {/* Dark scrim for legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Bottom fade into app background */}
        <LinearGradient
          colors={['transparent', colors.background]}
          locations={[0.65, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.heroContent} edges={['top']}>
          {/* Greeting — top left */}
          <Text style={styles.greeting}>{greeting}</Text>

          {/* Ring — centered */}
          <View style={styles.ringWrapper}>
            <BudgetRing progress={progress} />
            {/* Inner text overlay */}
            <View style={styles.ringCenter}>
              <Text style={styles.ringPercent}>
                {(progress * 100).toFixed(0)}%
              </Text>
              <Text style={styles.ringSubLabel}>daily budget</Text>
            </View>
          </View>

          {/* Status label — below ring */}
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusLabel}
          </Text>
          {todayTotal > 0 && (
            <Text style={styles.todayKg}>
              {todayTotal.toFixed(1)} kg CO₂e today
            </Text>
          )}
        </SafeAreaView>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Data card */}
        <VCard elevation="lg" style={styles.dataCard}>
          <View style={styles.dataRow}>
            <View style={styles.dataCol}>
              <Text style={styles.dataNumber}>{todayTotal.toFixed(1)}</Text>
              <Text style={styles.dataLabel}>kg today</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataCol}>
              <Text style={styles.dataNumber}>
                {(weekly?.total_kg_co2e ?? 0).toFixed(1)}
              </Text>
              <Text style={styles.dataLabel}>kg this week</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataCol}>
              <Text style={[styles.dataNumber, { color: progress >= 1 ? '#EF4444' : colors.primary }]}>
                {(DAILY_CARBON_BUDGET_KG - todayTotal > 0
                  ? DAILY_CARBON_BUDGET_KG - todayTotal
                  : 0
                ).toFixed(1)}
              </Text>
              <Text style={styles.dataLabel}>kg remaining</Text>
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

        {/* Recent entries */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {entriesLoading ? (
          <>
            <View style={{ marginBottom: spacing.sm }}><VSkeleton width="100%" height={56} /></View>
            <View style={{ marginBottom: spacing.sm }}><VSkeleton width="100%" height={56} /></View>
          </>
        ) : recentEntries.length === 0 ? (
          <VEmptyState title="No entries yet" body="Tap Log to record your first emission" />
        ) : (
          recentEntries.slice(0, 5).map((entry) => (
            <VCard key={entry.id} elevation="sm" style={styles.entryCard}>
              <View style={styles.entryRow}>
                <View style={styles.entryLeft}>
                  <VBadge label={entry.emission_factors.category} variant={entry.emission_factors.category} />
                  <Text style={styles.entryItem} numberOfLines={1}>{entry.emission_factors.item}</Text>
                </View>
                <Text style={styles.entryValue}>{entry.kg_co2e_total.toFixed(2)} kg</Text>
              </View>
            </VCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const tons = (value / 1000).toFixed(2);
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={barStyles.value}>{tons}t</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  label: { fontSize: 12, color: colors.textSecondary, width: 64 },
  track: { flex: 1, height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  value: { fontSize: 12, color: colors.textSecondary, width: 32, textAlign: 'right' },
});

const styles = StyleSheet.create({
  heroContainer: {
    height: 380,
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    letterSpacing: 0.3,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
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
  ringPercent: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  ringSubLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  todayKg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dataCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
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
    width: 1,
    height: 40,
    backgroundColor: colors.background,
  },
  dataNumber: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 30,
  },
  dataLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  barsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  entryCard: { marginBottom: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  entryItem: { fontSize: typography.sizes.sm, color: colors.textPrimary, flex: 1 },
  entryValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
});
