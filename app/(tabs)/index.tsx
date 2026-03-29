import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWeeklySummary } from '@/hooks/useSummaries';
import { useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { getLocalDateString } from '@/lib/emissions';
import {
  VProgressRing,
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

// Rotate photo by day of week
const todayPhoto = HERO_IMAGES[new Date().getDay() % HERO_IMAGES.length];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySummary(user?.id);
  const { data: recentEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);

  const todayTotal = recentEntries
    .filter(e => getLocalDateString(new Date(e.logged_at)) === today)
    .reduce((sum, e) => sum + e.kg_co2e_total, 0);

  const isLoading = entriesLoading;
  const progress = Math.min(todayTotal / DAILY_CARBON_BUDGET_KG, 1);

  // Softer palette that reads well over photo without overwhelming green
  const ringColor =
    todayTotal === 0 ? 'rgba(255,255,255,0.6)' :
    todayTotal <= 7 ? '#4ADE80' :
    todayTotal <= 15 ? '#F59E0B' :
    '#EF4444';

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

  const statusLabel =
    todayTotal === 0 ? 'Nothing logged yet' :
    progress < 0.5 ? 'On track today' :
    progress < 1 ? 'Getting close' :
    'Over daily budget';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Hero section: fixed height, photo + ring centered ── */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={todayPhoto}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        {/* Subtle top scrim so status bar icons read */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent']}
          locations={[0, 0.25]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Bottom fade to dark background */}
        <LinearGradient
          colors={['transparent', colors.background]}
          locations={[0.6, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.heroContent} edges={['top']}>
          <Text style={styles.dateLabel}>Today</Text>

          {isLoading ? (
            <VSkeleton
              width={220}
              height={220}
              style={{ borderRadius: 110, alignSelf: 'center', marginVertical: spacing.lg }}
            />
          ) : (
            <View style={styles.ringWrap}>
              <VProgressRing
                progress={progress}
                size={220}
                strokeWidth={12}
                color={ringColor}
              >
                <View style={styles.ringInner}>
                  <Text style={styles.ringMetric}>
                    {todayTotal.toFixed(1)}
                  </Text>
                  <Text style={styles.ringUnit}>kg CO₂e</Text>
                </View>
              </VProgressRing>
            </View>
          )}

          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </SafeAreaView>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* This Week */}
        <VCard elevation="md" style={styles.weekCard}>
          <Text style={styles.sectionTitle}>This Week</Text>
          {weeklyLoading ? (
            <VSkeleton width="100%" height={40} />
          ) : (
            <>
              <View style={styles.weekRow}>
                <CategoryPill label="Food" value={weekly?.breakdown?.food ?? 0} color={colors.food} />
                <CategoryPill label="Transport" value={weekly?.breakdown?.transport ?? 0} color={colors.transport} />
                <CategoryPill label="Energy" value={weekly?.breakdown?.energy ?? 0} color={colors.energy} />
              </View>
              <Text style={styles.weekTotal}>
                {(weekly?.total_kg_co2e ?? 0).toFixed(1)} kg total this week
              </Text>
            </>
          )}
        </VCard>

        {/* AI Insight */}
        <VAiInsightCard insight={insight} isLoading={insightLoading} error={insightError} />

        {/* Recent Entries */}
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
    </View>
  );
}

function CategoryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={pillStyles.wrap}>
      <View style={[pillStyles.dot, { backgroundColor: color }]} />
      <Text style={pillStyles.label}>{label}</Text>
      <Text style={[pillStyles.value, { fontFamily: 'JetBrainsMono_700Bold', color }]}>
        {value.toFixed(1)}
      </Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, color: colors.textSecondary },
  value: { fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
  heroContainer: {
    height: 400,
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  ringWrap: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  ringInner: {
    alignItems: 'center',
    gap: 2,
  },
  ringMetric: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 48,
    color: '#FFFFFF',
    lineHeight: 52,
  },
  ringUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  weekCard: { marginBottom: spacing.md },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.sm,
  },
  weekTotal: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
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
