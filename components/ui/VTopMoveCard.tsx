import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { VText } from './VText';
import { VPressable } from './VPressable';
import { colors, spacing, radii, shadows, motion } from '@/lib/theme';
import type { TopMove } from '@/lib/topMoves';
import type { EmissionCategory } from '@/types/emission';

// ─────────────────────────────────────────────────────────────────────────────
// VTopMoveCard — one ranked carbon-reduction opportunity.
//
// Card #1 (hero)  — 1px LinearGradient border, same treatment as VAiInsightCard.
// Cards #2–3      — plain white surface with subtle shadow + 1px border.
//
// The saving pill on card #1 scales in with a spring after 600ms for emphasis.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  food: colors.food,
  transport: colors.transport,
  energy: colors.energy,
  shopping: colors.shopping,
};

interface VTopMoveCardProps {
  move: TopMove;
  /** 0-indexed position in the rendered list */
  index: number;
  onPress: () => void;
}

export function VTopMoveCard({ move, index, onPress }: VTopMoveCardProps) {
  const isHero = index === 0;
  const dotColor = CATEGORY_COLORS[move.category];

  // Saving pill: scale-in spring for the hero card only
  const pillScale = useSharedValue(isHero ? 0.6 : 1);

  useEffect(() => {
    if (isHero) {
      pillScale.value = withDelay(600, withSpring(1, motion.springGentle));
    }
  }, [isHero, pillScale]);

  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));

  const innerContent = (
    <View style={styles.row}>
      {/* ── Rank medallion ── */}
      <View style={styles.medallion}>
        <VText variant="mono" style={styles.medallionText}>
          {move.rank}
        </VText>
      </View>

      {/* ── Text column ── */}
      <View style={styles.textCol}>
        <VText style={styles.title} numberOfLines={2}>
          {move.title}
        </VText>
        <View style={styles.detailRow}>
          <View style={[styles.categoryDot, { backgroundColor: dotColor }]} />
          <VText variant="caption" style={styles.detailText} numberOfLines={1}>
            {move.detail}
          </VText>
        </View>
      </View>

      {/* ── Saving pill ── */}
      <Animated.View style={[styles.pill, pillAnimStyle]}>
        <VText variant="mono" style={styles.pillText}>
          {`−${move.weeklySavingKg.toFixed(1)} kg/wk`}
        </VText>
      </Animated.View>
    </View>
  );

  if (isHero) {
    return (
      <VPressable
        onPress={onPress}
        haptic="light"
        style={styles.heroWrapper}
        accessibilityRole="button"
        accessibilityLabel={`Move ${move.rank}: ${move.title}, saves ${move.weeklySavingKg.toFixed(1)} kilograms per week`}
      >
        <View style={styles.heroBorder}>
          <LinearGradient
            colors={['rgba(95,168,118,0.30)', 'rgba(95,168,118,0.08)', 'rgba(95,168,118,0.20)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroInner}>
            {innerContent}
          </View>
        </View>
      </VPressable>
    );
  }

  return (
    <VPressable
      onPress={onPress}
      haptic="light"
      style={styles.plainCard}
      accessibilityRole="button"
      accessibilityLabel={`Move ${move.rank}: ${move.title}, saves ${move.weeklySavingKg.toFixed(1)} kilograms per week`}
    >
      {innerContent}
    </VPressable>
  );
}

const styles = StyleSheet.create({
  // Hero card (rank #1) — 1px gradient-border treatment
  heroWrapper: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  heroBorder: {
    borderRadius: radii.lg,
    padding: 1,
    overflow: 'hidden',
  },
  heroInner: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg - 1,
    padding: spacing.md,
  },

  // Plain cards (ranks #2–3)
  plainCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },

  // Card row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Rank medallion
  medallion: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionText: {
    fontSize: 13,
    color: colors.primary,
  },

  // Text column
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },

  // Saving pill
  pill: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 13,
    color: colors.primary,
  },
});
