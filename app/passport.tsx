import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { useCarbonPassport, type PassportPeriod } from '@/hooks/useCarbonPassport';
import { winCopy } from '@/lib/recap';
import { formatKg } from '@/lib/format';
import { EmissionBarChart, type BarChartDataItem } from '@/components/charts/EmissionBarChart';
import {
  VText,
  VIcon,
  VCountUp,
  VPressable,
  VEmptyState,
  type VIconName,
} from '@/components/ui';
import { colors, spacing, typography, radii, shadows, motion } from '@/lib/theme';
import type { EmissionCategory, TripMode } from '@/types/emission';
import type { ModeSplitEntry } from '@/lib/recap';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const PAGE_COUNT = 5;

// ─── Atmosphere — a static, battery-cheap grain overlay ────────────────────────
// Procedural dot-grid rather than an image asset: a fixed, memoized scatter of
// ~90 hairline dots at ~3% opacity on `background`. Computed once per mount,
// never animated — this is texture, not motion.
function NoiseOverlay() {
  const dots = useMemo(() => {
    const count = 90;
    const seeded: { left: number; top: number; size: number; opacity: number }[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < count; i++) {
      seeded.push({
        left: rand() * SCREEN_WIDTH,
        top: rand() * SCREEN_HEIGHT,
        size: rand() > 0.6 ? 2 : 1,
        opacity: 0.02 + rand() * 0.02,
      });
    }
    return seeded;
  }, []);

  return (
    <View pointerEvents="none" style={styles.noiseOverlay}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            borderRadius: d.size,
            backgroundColor: colors.textPrimary,
            opacity: d.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Hero count-up-with-glow — Veridian's signature motion pattern ─────────────
// Every headline metric on the two "story" screens uses this: the number
// counts up (VCountUp, unchanged) while a soft primaryGlow halo behind it
// overshoots and settles via spring — never a flat tween.
function HeroGlowNumber({
  value,
  decimals = 1,
  duration = 1100,
  style,
  glowSize = 220,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  style?: object;
  glowSize?: number;
}) {
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withSequence(
      withSpring(1, motion.springBouncy),
      withSpring(0.6, motion.springGentle),
    );
    glowScale.value = withSequence(
      withSpring(1.12, motion.springBouncy),
      withSpring(1, motion.springGentle),
    );
  }, [value, glowOpacity, glowScale]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={styles.glowWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowHalo,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            top: '50%',
            left: '50%',
            marginLeft: -glowSize / 2,
            marginTop: -glowSize / 2,
          },
          glowStyle,
        ]}
      />
      <VCountUp value={value} decimals={decimals} duration={duration} style={style} />
    </View>
  );
}

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

const MODE_LABEL: Record<TripMode, string> = {
  car: 'Car',
  walk: 'Walk',
  cycling: 'Cycling',
  bus: 'Bus',
  train: 'Train',
  unknown: 'Other',
};

const MODE_ICON: Record<TripMode, VIconName> = {
  car: 'car',
  bus: 'car',
  train: 'car',
  cycling: 'bike',
  walk: 'walk',
  unknown: 'location',
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

// ─── Segmented control — This Month / This Year, both reachable without leaving ──
function PeriodSwitch({
  period,
  onChange,
}: {
  period: PassportPeriod;
  onChange: (p: PassportPeriod) => void;
}) {
  return (
    <View style={styles.switchTrack}>
      {(['month', 'year'] as PassportPeriod[]).map((p) => (
        <VPressable
          key={p}
          onPress={() => onChange(p)}
          haptic="light"
          style={[styles.switchOption, period === p && styles.switchOptionActive]}
          accessibilityRole="button"
          accessibilityLabel={p === 'month' ? 'This Month' : 'This Year'}
        >
          <VText
            variant="label"
            style={[styles.switchLabel, period === p && styles.switchLabelActive]}
          >
            {p === 'month' ? 'This Month' : 'This Year'}
          </VText>
        </VPressable>
      ))}
    </View>
  );
}

// ─── Page 1 — hero period total + period-over-period delta ────────────────────
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
        <HeroGlowNumber value={totalKg} decimals={1} duration={1100} style={styles.heroNumber} />
        <VText variant="label" style={styles.heroUnit}>
          kg CO₂e
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
function SplitPage({ bars, insight }: { bars: BarChartDataItem[]; insight: string | null }) {
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

// ─── Page 3 — mode split + "N trips tracked themselves", the autopilot thesis ──
function ModePage({
  modeSplit,
  tripsTrackedThemselves,
}: {
  modeSplit: ModeSplitEntry[];
  tripsTrackedThemselves: number;
}) {
  const totalKm = modeSplit.reduce((sum, m) => sum + m.km, 0);
  return (
    <View style={styles.pageTop}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <VText variant="title" style={styles.pageTitle}>
          How you moved
        </VText>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.tripsStatWrap}>
        <HeroGlowNumber
          value={tripsTrackedThemselves}
          decimals={0}
          duration={900}
          style={styles.tripsStatNumber}
          glowSize={160}
        />
        <VText variant="body" style={styles.tripsStatLabel}>
          trips tracked themselves
        </VText>
        <VText variant="caption" style={styles.tripsStatSub}>
          No typing. No logging. Just your life, ledgered.
        </VText>
      </Animated.View>
      <View style={styles.modeRows}>
        {modeSplit
          .slice()
          .sort((a, b) => b.km - a.km)
          .map((m, i) => {
            const share = totalKm > 0 ? m.km / totalKm : 0;
            return (
              <Animated.View
                key={m.mode}
                entering={FadeInDown.duration(400).delay(160 + i * 60)}
                style={styles.modeRow}
              >
                <View style={styles.modeIconWrap}>
                  <VIcon name={MODE_ICON[m.mode]} size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.modeRowHeader}>
                    <VText variant="body" style={styles.modeLabel}>
                      {MODE_LABEL[m.mode]}
                    </VText>
                    <VText variant="caption" style={styles.modeKm}>
                      {m.km.toFixed(1)} km · {m.count} {m.count === 1 ? 'trip' : 'trips'}
                    </VText>
                  </View>
                  <View style={styles.modeTrack}>
                    <View style={[styles.modeFill, { width: `${Math.max(share * 100, 3)}%` }]} />
                  </View>
                </View>
              </Animated.View>
            );
          })}
      </View>
    </View>
  );
}

// ─── Page 4 — the period's win, celebration-framed ─────────────────────────────
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

// ─── Page 5 — THE growth-loop artifact. Composed, not reskinned. ──────────────
function PassportCard({
  period,
  rangeLabel,
  totalKg,
  tripsTrackedThemselves,
  topStat,
}: {
  period: PassportPeriod;
  rangeLabel: string;
  totalKg: number;
  tripsTrackedThemselves: number;
  topStat: string;
}) {
  return (
    <View style={styles.pageCenter}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.passportCardShadow}>
        <LinearGradient
          colors={[colors.primaryDeep, colors.primary, colors.primaryDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passportCard}
        >
          {/* Faint watermark ring — texture, not noise */}
          <View style={styles.passportRingGhost} />

          <View style={styles.passportHeaderRow}>
            <View style={styles.passportMarkWrap}>
              <VIcon name="leaf" size={16} color="#FFFFFF" strokeWidth={2} />
            </View>
            <VText style={styles.passportWordmark}>Veridian</VText>
          </View>

          <VText style={styles.passportKicker}>
            {period === 'month' ? 'MONTHLY PASSPORT' : 'ANNUAL PASSPORT'}
          </VText>
          <VText style={styles.passportRange}>{rangeLabel}</VText>

          <View style={styles.passportHeroRow}>
            <HeroGlowNumber
              value={totalKg}
              decimals={1}
              duration={1000}
              style={styles.passportHeroNumber}
              glowSize={180}
            />
            <VText style={styles.passportHeroUnit}>kg CO₂e</VText>
          </View>

          <View style={styles.passportDivider} />

          <View style={styles.passportStatRow}>
            <VText style={styles.passportStatNumber}>{tripsTrackedThemselves}</VText>
            <VText style={styles.passportStatLabel}>
              {tripsTrackedThemselves === 1 ? 'trip tracked itself' : 'trips tracked themselves'}
            </VText>
          </View>

          <VText style={styles.passportTopStat} numberOfLines={2}>
            {topStat}
          </VText>
        </LinearGradient>
      </Animated.View>
      <VText variant="caption" style={styles.shareHint}>
        Screenshot to share your {period === 'month' ? 'month' : 'year'}
      </VText>
    </View>
  );
}

// ─── The story ─────────────────────────────────────────────────────────────────
export default function PassportScreen() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<PassportPeriod>('month');
  const [index, setIndex] = useState(0);
  const passport = useCarbonPassport(user?.id, period);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  const next = () => {
    if (index >= PAGE_COUNT - 1) close();
    else setIndex((i) => i + 1);
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const changePeriod = (p: PassportPeriod) => {
    if (p === period) return;
    setPeriod(p);
    setIndex(0);
  };

  // ── Loading / not-enough-data guards ──
  if (passport.isLoading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!passport.isReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <NoiseOverlay />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <VPressable
            onPress={close}
            haptic="light"
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close passport"
          >
            <VIcon name="close" size={22} color={colors.textSecondary} />
          </VPressable>
        </View>
        <View style={styles.headerRow}>
          <PeriodSwitch period={period} onChange={changePeriod} />
        </View>
        <View style={styles.pageCenter}>
          <VEmptyState
            icon={<VIcon name="chart" size={40} color={colors.primaryLight} />}
            title={period === 'month' ? 'Your month is still filling in' : 'Your year is still filling in'}
            body="Once you've moved or logged a bit more, your passport appears here."
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Page data ──
  const { delta, split, topCategory, win, rangeLabel, tripStats } = passport;
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

  const topStat =
    win.kind === 'zero'
      ? `${copy.title} — saved ${formatKg(win.savedKg)}`
      : topCategory
        ? `Mostly ${CATEGORY_LABEL[topCategory.category].toLowerCase()} · ${formatKg(topCategory.kg)}`
        : copy.title;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NoiseOverlay />
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
          accessibilityLabel="Close passport"
        >
          <VIcon name="close" size={22} color={colors.textSecondary} />
        </VPressable>
      </View>

      <View style={styles.switchRow}>
        <PeriodSwitch period={period} onChange={changePeriod} />
      </View>

      {/* One page at a time — remounting on index change retriggers the
          restrained FadeIn/FadeInDown entrances (Reanimated). */}
      <Animated.View key={`${period}-${index}`} entering={FadeIn.duration(260)} style={styles.pageArea}>
        {index === 0 && (
          <HeroPage
            rangeLabel={rangeLabel}
            totalKg={passport.currentKg}
            deltaSentence={delta.sentence}
            improved={delta.improved}
          />
        )}
        {index === 1 && <SplitPage bars={bars} insight={topCategory?.insight ?? null} />}
        {index === 2 && (
          <ModePage
            modeSplit={tripStats.modeSplit}
            tripsTrackedThemselves={tripStats.tripsTrackedThemselves}
          />
        )}
        {index === 3 && (
          <WinPage icon={winIcon} eyebrow={copy.eyebrow} title={copy.title} body={copy.body} />
        )}
        {index === 4 && (
          <PassportCard
            period={period}
            rangeLabel={rangeLabel}
            totalKg={passport.currentKg}
            tripsTrackedThemselves={tripStats.tripsTrackedThemselves}
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
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  switchRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  switchTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    padding: 3,
  },
  switchOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  switchOptionActive: {
    backgroundColor: colors.surface,
    ...shadows.hero,
  },
  switchLabel: {
    color: colors.textTertiary,
  },
  switchLabelActive: {
    color: colors.primary,
    fontWeight: '700',
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
    fontSize: 104,
    lineHeight: 108,
    letterSpacing: typography.letterSpacing.tight,
    fontWeight: typography.weights.semibold,
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
  // ── Mode split page ──
  tripsStatWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tripsStatNumber: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 64,
    lineHeight: 70,
    letterSpacing: typography.letterSpacing.tight,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  tripsStatLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
  tripsStatSub: {
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  modeRows: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primaryGlowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  modeLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modeKm: {
    color: colors.textTertiary,
  },
  modeTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  modeFill: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
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
  // ── Page 5 — the growth-loop artifact ──
  passportCardShadow: {
    alignSelf: 'stretch',
    borderRadius: radii.xxl,
    marginBottom: spacing.md,
    ...shadows.hero,
  },
  passportCard: {
    alignSelf: 'stretch',
    borderRadius: radii.xxl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  // This card is a deliberate dark evergreen surface — a passport cover, the
  // one permitted exception to the light canvas (DESIGN_DIRECTION.md — full-
  // bleed treatment reserved for emotional/shareable moments). Its on-card
  // text and icon colors are explicit whites, NOT colors.textPrimary/border —
  // those tokens mean near-black ink / dark hairlines under Clearing and
  // would be invisible against this gradient.
  passportRingGhost: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 28,
    borderColor: 'rgba(255,255,255,0.12)',
    top: -90,
    right: -80,
  },
  passportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  passportMarkWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportWordmark: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#FFFFFF',
  },
  passportKicker: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: typography.letterSpacing.widest,
    color: 'rgba(255,255,255,0.62)',
    marginBottom: spacing.xxs,
  },
  passportRange: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: spacing.lg,
  },
  passportHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  passportHeroNumber: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: typography.letterSpacing.tight,
    fontWeight: typography.weights.semibold,
    color: '#FFFFFF',
  },
  passportHeroUnit: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  passportDivider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: spacing.lg,
  },
  passportStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  passportStatNumber: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 32,
    // Explicit line height: without it the system font's tall glyphs (a "0") are
    // clipped by the row and read as a "U" on the shareable card.
    lineHeight: 38,
    fontWeight: typography.weights.semibold,
    color: '#FFFFFF',
  },
  passportStatLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  passportTopStat: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
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
