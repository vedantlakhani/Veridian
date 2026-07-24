import { useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { winCopy } from '@/lib/recap';
import { formatKg } from '@/lib/format';
import { EmissionBarChart, type BarChartDataItem } from '@/components/charts/EmissionBarChart';
import {
  VText,
  VIcon,
  VCountUp,
  VHeroCountUp,
  VPressable,
  VEmptyState,
  type VIconName,
} from '@/components/ui';
import { colors, spacing, typography, radii, shadows } from '@/lib/theme';
import type { EmissionCategory } from '@/types/emission';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PAGE_COUNT = 4;

const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  food: colors.food,
  transport: colors.transport,
  energy: colors.energy,
  shopping: colors.shopping,
};

const CATEGORY_LABEL: Record<EmissionCategory, string> = {
  food: 'Food',
  transport: 'Move',
  energy: 'Power',
  shopping: 'Buy',
};

// ─── Top progress segments — Screen-Time / Wrapped style ──────────────────────
function StoryProgress({ index }: { index: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: PAGE_COUNT }).map((_, i) => (
        <View key={i} style={styles.progressTrack}>
          <View style={[styles.progressFill, { opacity: i <= index ? 1 : 0.18 }]} />
        </View>
      ))}
    </View>
  );
}

// ─── Page 1 — hero week total + week-over-week delta ──────────────────────────
function HeroPage({
  rangeLabel,
  totalKg,
  deltaSentence,
  improved,
}: {
  rangeLabel: string;
  totalKg: number;
  deltaSentence: string;
  improved: boolean;
}) {
  return (
    <View style={styles.pageCenter}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <VText variant="label" style={styles.eyebrow}>
          {rangeLabel}
        </VText>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.heroNumberWrap}>
        <VHeroCountUp
          value={totalKg}
          decimals={1}
          duration={1100}
          style={styles.heroNumber}
          pulseKey={rangeLabel}
        />
        <VText variant="label" style={styles.heroUnit}>
          kg CO₂e this week
        </VText>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(160)}>
        <VText
          variant="heading"
          style={[styles.deltaLine, { color: improved ? colors.primary : colors.textSecondary }]}
        >
          {deltaSentence}
        </VText>
      </Animated.View>
    </View>
  );
}

// ─── Page 2 — category split + biggest category insight ───────────────────────
function SplitPage({
  bars,
  insight,
}: {
  bars: BarChartDataItem[];
  insight: string | null;
}) {
  return (
    <View style={styles.pageTop}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <VText variant="title" style={styles.pageTitle}>
          Where it came from
        </VText>
      </Animated.View>
      <Animated.View entering={FadeIn.duration(500).delay(120)} style={styles.chartWrap}>
        <EmissionBarChart data={bars} width={SCREEN_WIDTH - spacing.lg * 2} height={240} />
      </Animated.View>
      {insight ? (
        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={styles.insightWrap}>
          <VText variant="body" style={styles.insightText}>
            {insight}
          </VText>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─── Page 3 — the week's win, celebration-framed ──────────────────────────────
function WinPage({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: VIconName;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.pageCenter}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.winIconWrap}>
        <VIcon name={icon} size={40} color={colors.primary} strokeWidth={2} />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <VText variant="label" style={styles.eyebrow}>
          {eyebrow}
        </VText>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(160)}>
        <VText variant="title" style={styles.winTitle}>
          {title}
        </VText>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(240)}>
        <VText variant="body" style={styles.winBody}>
          {body}
        </VText>
      </Animated.View>
    </View>
  );
}

// ─── Page 4 — screenshot-shareable summary card ───────────────────────────────
function SummaryPage({
  rangeLabel,
  totalKg,
  deltaSentence,
  improved,
  topStat,
}: {
  rangeLabel: string;
  totalKg: number;
  deltaSentence: string;
  improved: boolean;
  topStat: string;
}) {
  return (
    <View style={styles.pageCenter}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.shareCard}>
        <VText variant="label" style={styles.cardRange}>
          {rangeLabel}
        </VText>
        <View style={styles.cardNumberRow}>
          <VHeroCountUp
            value={totalKg}
            decimals={1}
            duration={1100}
            style={styles.cardNumber}
            pulseKey={rangeLabel}
          />
          <VText variant="label" style={styles.cardUnit}>
            kg CO₂e
          </VText>
        </View>
        <View
          style={[
            styles.cardDeltaChip,
            { backgroundColor: improved ? colors.successGlow : colors.surfaceElevated },
          ]}
        >
          <VText
            variant="caption"
            style={[
              styles.cardDeltaText,
              { color: improved ? colors.primary : colors.textSecondary },
            ]}
          >
            {deltaSentence}
          </VText>
        </View>
        <View style={styles.cardDivider} />
        <VText variant="body" style={styles.cardTopStat}>
          {topStat}
        </VText>
        <View style={styles.cardWordmarkRow}>
          <VIcon name="leaf" size={16} color={colors.primary} strokeWidth={2} />
          <VText style={styles.cardWordmark}>Veridian</VText>
        </View>
      </Animated.View>
      <VText variant="caption" style={styles.shareHint}>
        Screenshot to share your week
      </VText>
    </View>
  );
}

// ─── The story ─────────────────────────────────────────────────────────────────
export default function RecapScreen() {
  const { user } = useAuthStore();
  const recap = useWeeklyRecap(user?.id);
  const [index, setIndex] = useState(0);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  const next = () => {
    if (index >= PAGE_COUNT - 1) close();
    else setIndex((i) => i + 1);
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // ── Loading / not-enough-data guards ──
  if (recap.isLoading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!recap.isReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <VPressable
            onPress={close}
            haptic="light"
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close recap"
          >
            <VIcon name="close" size={22} color={colors.textSecondary} />
          </VPressable>
        </View>
        <View style={styles.pageCenter}>
          <VEmptyState
            icon={<VIcon name="chart" size={40} color={colors.primaryLight} />}
            title="Your week is still filling in"
            body="Once you've moved or logged on a couple of days this week, your recap appears here."
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Page data ──
  const { delta, split, topCategory, win, weekRangeLabel } = recap;
  const bars: BarChartDataItem[] = (
    ['transport', 'food', 'energy', 'shopping'] as EmissionCategory[]
  )
    .map((cat) => ({ label: CATEGORY_LABEL[cat], value: split[cat], color: CATEGORY_COLORS[cat] }))
    .filter((b) => b.value > 0);

  const copy = winCopy(win);
  const winIcon: VIconName =
    win.kind === 'zero'
      ? win.cycleKm > win.walkKm
        ? 'bike'
        : 'walk'
      : win.kind === 'light-day'
        ? 'leaf'
        : 'sparkle';

  // Top stat for the share card — the win when it's a real celebration, else
  // the dominant category.
  const topStat =
    win.kind === 'zero'
      ? `${copy.title} — saved ${formatKg(win.savedKg)}`
      : topCategory
        ? `Mostly ${CATEGORY_LABEL[topCategory.category].toLowerCase()} · ${formatKg(topCategory.kg)}`
        : copy.title;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        {index > 0 ? (
          <VPressable
            onPress={back}
            haptic="light"
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <VIcon name="chevron-left" size={22} color={colors.textSecondary} />
          </VPressable>
        ) : (
          <View style={{ width: 22 }} />
        )}
        <StoryProgress index={index} />
        <VPressable
          onPress={close}
          haptic="light"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close recap"
        >
          <VIcon name="close" size={22} color={colors.textSecondary} />
        </VPressable>
      </View>

      {/* One page at a time — remounting on index change retriggers the
          restrained FadeIn/FadeInDown entrances (Reanimated). */}
      <Animated.View key={index} entering={FadeIn.duration(260)} style={styles.pageArea}>
        {index === 0 && (
          <HeroPage
            rangeLabel={weekRangeLabel}
            totalKg={recap.currentKg}
            deltaSentence={delta.sentence}
            improved={delta.improved}
          />
        )}
        {index === 1 && <SplitPage bars={bars} insight={topCategory?.insight ?? null} />}
        {index === 2 && (
          <WinPage icon={winIcon} eyebrow={copy.eyebrow} title={copy.title} body={copy.body} />
        )}
        {index === 3 && (
          <SummaryPage
            rangeLabel={weekRangeLabel}
            totalKg={recap.currentKg}
            deltaSentence={delta.sentence}
            improved={delta.improved}
            topStat={topStat}
          />
        )}
      </Animated.View>

      <View style={styles.footer}>
        <VPressable
          onPress={next}
          haptic="light"
          style={styles.nextButton}
          accessibilityRole="button"
          accessibilityLabel={index >= PAGE_COUNT - 1 ? 'Done' : 'Next'}
        >
          <VText style={styles.nextButtonText}>
            {index >= PAGE_COUNT - 1 ? 'Done' : 'Next'}
          </VText>
        </VPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.trackOnDark,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  pageArea: {
    flex: 1,
  },
  pageCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pageTop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  eyebrow: {
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  heroNumberWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroNumber: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 88,
    lineHeight: 96,
    letterSpacing: typography.letterSpacing.tight,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroUnit: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  deltaLine: {
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  pageTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  chartWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  insightWrap: {
    paddingHorizontal: spacing.md,
  },
  insightText: {
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textSecondary,
  },
  winIconWrap: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.successGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  winTitle: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  winBody: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },
  // ── Share card ──
  shareCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.hero,
  },
  cardRange: {
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  cardNumberRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardNumber: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 68,
    lineHeight: 74,
    letterSpacing: typography.letterSpacing.tight,
    color: colors.textPrimary,
  },
  cardUnit: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardDeltaChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  cardDeltaText: {
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  cardTopStat: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  cardWordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardWordmark: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.primary,
  },
  shareHint: {
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // ── Footer ──
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  nextButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    minHeight: 54,
    ...shadows.glowPrimary,
  },
  nextButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
