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

export default function HomeScreen() {
  const { user } = useAuthStore();
  const today = getLocalDateString();
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySummary(user?.id);
  // Fetch all entries — filter today's in JS to avoid UTC midnight timezone mismatch
  const { data: recentEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);

  // Filter by local date in JS — avoids UTC midnight timezone mismatch
  const todayTotal = recentEntries
    .filter(e => getLocalDateString(new Date(e.logged_at)) === today)
    .reduce((sum, e) => sum + e.kg_co2e_total, 0);
  const isLoading = entriesLoading;
  const progress = Math.min(todayTotal / DAILY_CARBON_BUDGET_KG, 1); // clamp to [0, 1]

  // Determine ring color: green below target, orange approaching budget, red at/over budget
  const ringColor =
    todayTotal <= 7 ? colors.primary :
    todayTotal <= 15 ? colors.warning :
    colors.error;

  // Build emission context for the AI insight hook.
  // Pass null until both weekly summary and entries are loaded — avoids a premature Claude call.
  const emissionContext: EmissionContext | null =
    weekly && recentEntries.length > 0
      ? {
          weeklyTotalKg: weekly.total_kg_co2e,
          foodKg: weekly.breakdown?.food ?? 0,
          transportKg: weekly.breakdown?.transport ?? 0,
          energyKg: weekly.breakdown?.energy ?? 0,
          // Top 3 items by kg_co2e_total from recent entries (last 7 days of data)
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

  const {
    data: insight,
    isLoading: insightLoading,
    error: insightError,
  } = useAiInsight(user?.id, emissionContext);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Layer 1: Full-bleed hero photo (absolute, fills entire screen) */}
      <ImageBackground
        source={HERO_IMAGES[0]}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />

      {/* Layer 2: Gradient overlay (bottom-to-top dark fade starting at 35% from top) */}
      <LinearGradient
        colors={['transparent', 'rgba(25,28,28,0.7)', '#191C1C']}
        locations={[0, 0.45, 0.85]}
        style={[StyleSheet.absoluteFillObject, { top: '35%' as unknown as number }]}
      />

      {/* Layer 3: Safe area content — no backgroundColor so photo shows through */}
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Hero section (top 40% of screen) */}
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>Today</Text>
            {isLoading ? (
              <VSkeleton width={200} height={96} style={{ alignSelf: 'center' }} />
            ) : (
              <Text style={styles.heroMetric}>
                {todayTotal.toFixed(1)}
              </Text>
            )}
            <Text style={styles.heroUnit}>kg CO₂e</Text>
            <Text style={styles.heroBudget}>
              {(progress * 100).toFixed(0)}% of {DAILY_CARBON_BUDGET_KG} kg daily budget
            </Text>
          </View>

          {/* Dark content sections below (sit on top of solid #191C1C) */}

          {/* Weekly progress ring — compact dark card */}
          <VCard elevation="md" style={styles.ringCard}>
            {weeklyLoading ? (
              <VSkeleton width={120} height={120} style={{ alignSelf: 'center' }} />
            ) : (
              <View style={styles.ringContainer}>
                <VProgressRing
                  progress={progress}
                  size={120}
                  strokeWidth={10}
                  color={ringColor}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.ringValue, { color: ringColor }]}>
                      {(progress * 100).toFixed(0)}%
                    </Text>
                  </View>
                </VProgressRing>
                <View style={styles.weeklyBreakdown}>
                  <Text style={styles.sectionTitle}>This Week</Text>
                  <View style={styles.weeklyRow}>
                    <CategoryMetric label="Food" value={weekly?.breakdown?.food ?? 0} color={colors.food} />
                    <CategoryMetric label="Transport" value={weekly?.breakdown?.transport ?? 0} color={colors.transport} />
                    <CategoryMetric label="Energy" value={weekly?.breakdown?.energy ?? 0} color={colors.energy} />
                  </View>
                  <Text style={styles.weeklyTotal}>
                    {(weekly?.total_kg_co2e ?? 0).toFixed(1)} kg CO₂e total
                  </Text>
                </View>
              </View>
            )}
          </VCard>

          {/* AI Insight */}
          <VAiInsightCard insight={insight} isLoading={insightLoading} error={insightError} />

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
      </SafeAreaView>

    </View>
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
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 280,
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  heroMetric: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 80,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    lineHeight: 88,
  },
  heroUnit: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  heroBudget: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.xs,
  },
  ringCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  ringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.sm,
  },
  weeklyBreakdown: { flex: 1 },
  ringValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.xl,
    fontWeight: '700',
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  weeklyTotal: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  entryCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  entryItem: { fontSize: typography.sizes.sm, color: colors.textPrimary, flex: 1 },
  entryValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
