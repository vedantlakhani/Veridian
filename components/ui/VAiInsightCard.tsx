import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { VSkeleton } from './VSkeleton';
import { VIcon } from './VIcon';
import { colors, spacing, typography, radii, motion } from '@/lib/theme';
import type { AiInsight } from '@/hooks/useAiInsight';

// ─────────────────────────────────────────────────────────────────────────────
// VAiInsightCard — 1px gradient border (the "special" treatment), heartbeat
// pulse dot, content cross-fade when the skeleton resolves, quiet retry row.
// ─────────────────────────────────────────────────────────────────────────────

interface VAiInsightCardProps {
  insight: AiInsight | null | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Kept for call-site compatibility; a failed call now hides the card. */
  onRetry?: () => void;
}

export function VAiInsightCard({ insight, isLoading, error }: VAiInsightCardProps) {
  const dotOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    dotOpacity.value = withRepeat(
      withTiming(0.35, { duration: 1200, easing: motion.easeHeartbeat }),
      -1,
      true,
    );
  }, [dotOpacity]);

  useEffect(() => {
    if (!isLoading && insight) {
      contentOpacity.value = 0;
      contentOpacity.value = withTiming(1, { duration: motion.timingBase });
    }
  }, [isLoading, insight, contentOpacity]);

  // Keep the failure visible to developers even though the card hides itself.
  useEffect(() => {
    if (error) console.warn('[AiInsight] generation failed:', error.message);
  }, [error]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Loading: skeleton keeps the layout stable
  if (isLoading) {
    return (
      <View style={styles.gradientBorder}>
        <LinearGradient
          colors={['rgba(27,107,66,0.30)', 'rgba(27,107,66,0.08)', 'rgba(27,107,66,0.20)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.card}>
          <VSkeleton width={120} height={14} style={{ marginBottom: spacing.sm }} />
          <VSkeleton width={'100%' as `${number}%`} height={40} style={{ marginBottom: spacing.sm }} />
          <VSkeleton width={'85%' as `${number}%`} height={32} />
        </View>
      </View>
    );
  }

  // Error: the AI tip is an enhancement, so a failed call hides the card rather
  // than leaving a dead "unavailable" row on the home screen. The real cause is
  // logged (see the effect above) so it stays diagnosable.
  if (error) return null;

  if (!insight) return null;

  return (
    <View style={styles.gradientBorder}>
      <LinearGradient
        colors={['rgba(27,107,66,0.30)', 'rgba(27,107,66,0.08)', 'rgba(27,107,66,0.20)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[styles.card, contentStyle]}>
        <View style={styles.header}>
          <Animated.View style={[styles.aiDot, dotStyle]} />
          <VIcon name="sparkle" size={12} color={colors.primaryLight} />
          <Text style={styles.label}>AI INSIGHT</Text>
        </View>
        <Text style={styles.content}>{insight.content}</Text>
        <View style={styles.suggestionRow}>
          <Text style={styles.suggestionLabel}>Try this</Text>
          <Text style={styles.suggestion}>{insight.suggestion}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: radii.lg,
    padding: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg - 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  content: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    lineHeight: typography.sizes.sm * 1.55,
    marginBottom: spacing.md,
  },
  suggestionRow: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  suggestionLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  suggestion: {
    fontSize: typography.sizes.sm,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  retryText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primaryLight,
  },
});
