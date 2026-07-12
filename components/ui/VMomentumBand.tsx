import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { VCard } from './VCard';
import { VIcon } from './VIcon';
import { VText } from './VText';
import { colors, spacing, radii, motion } from '@/lib/theme';
import type { MomentumBand } from '@/lib/momentum';

// ─────────────────────────────────────────────────────────────────────────────
// VMomentumBand — "Momentum, not streaks" (NORTH_STAR.md §8 pattern 5).
// A compact horizontal go-zone band, not a breakable counter: width springs
// to the current 0-100 score and the fill color deepens with the band. There
// is no "broken" state to render — a quiet stretch just shows a shorter,
// paler bar, never red, never a reset animation.
// ─────────────────────────────────────────────────────────────────────────────

const BAND_META: Record<
  MomentumBand,
  { label: string; short: string; gradient: readonly [string, string] }
> = {
  // Muted, flat, neutral — a fresh or quiet rhythm still finding its shape.
  building: { label: 'Building momentum', short: 'Building', gradient: [colors.textTertiary, colors.textTertiary] },
  // The everyday "green and going" tone shared with the calm ring state.
  steady: { label: 'Steady rhythm', short: 'Steady', gradient: ['#2E9E62', '#1B6B42'] },
  // Deepest forest tone — the same accent reserved for encouragement.
  strong: { label: 'Strong momentum', short: 'Strong', gradient: ['#1B6B42', '#134F31'] },
};

interface VMomentumBandProps {
  /** 0–100, from lib/momentum.ts computeMomentum() */
  score: number;
  band: MomentumBand;
  /** 'pill' — compact chip for tight header space (replaces a streak chip).
   *  'card' — stat-tile shape sized to slot into a 3-up stats row. */
  variant?: 'pill' | 'card';
}

export function VMomentumBand({ score, band, variant = 'card' }: VMomentumBandProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withSpring(clamped / 100, motion.springGentle);
  }, [clamped, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(fill.value, 0.04) }],
  }));

  const meta = BAND_META[band];
  const accent = meta.gradient[1];
  const a11yLabel = `Momentum: ${meta.label}`;

  if (variant === 'pill') {
    return (
      <View style={pillStyles.wrap} accessibilityLabel={a11yLabel}>
        <VIcon name="leaf" size={12} color={accent} strokeWidth={2} />
        <View style={pillStyles.track}>
          <Animated.View style={[pillStyles.fillWrap, fillStyle]}>
            <LinearGradient
              colors={meta.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={pillStyles.fill}
            />
          </Animated.View>
        </View>
        <VText variant="mono" style={[pillStyles.label, { color: accent }]}>
          {meta.short}
        </VText>
      </View>
    );
  }

  return (
    <VCard elevation="sm" style={cardStyles.card} accessibilityLabel={a11yLabel}>
      <VText variant="label" style={cardStyles.label}>
        Momentum
      </VText>
      <VText variant="heading" style={[cardStyles.value, { color: accent }]} numberOfLines={1}>
        {meta.short}
      </VText>
      <View style={cardStyles.track}>
        <Animated.View style={[cardStyles.fillWrap, fillStyle]}>
          <LinearGradient
            colors={meta.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.fill}
          />
        </Animated.View>
      </View>
    </VCard>
  );
}

const TRACK_HEIGHT = 5;

const pillStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(27,107,66,0.08)',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  track: {
    width: 32,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.trackOnDark,
    overflow: 'hidden',
  },
  fillWrap: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
  fill: {
    flex: 1,
    borderRadius: TRACK_HEIGHT / 2,
  },
  label: {
    fontSize: 12,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  label: {
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 17,
    marginBottom: spacing.sm,
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.trackOnDark,
    overflow: 'hidden',
  },
  fillWrap: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
  fill: {
    flex: 1,
    borderRadius: TRACK_HEIGHT / 2,
  },
});
