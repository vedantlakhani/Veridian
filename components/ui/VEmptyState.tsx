import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { VButton } from './VButton';
import { colors, typography, spacing, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VEmptyState — gentle mount animation, ReactNode icon slot, spacing hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

interface VEmptyStateProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** VIcon / illustration node, or emoji string for compat */
  icon?: ReactNode;
  /** Fill available space (old flex:1 behavior) */
  fill?: boolean;
  /** Button visual weight — defaults to 'primary'; use 'secondary' where the
   *  empty state shouldn't read as the screen's headline action. */
  ctaVariant?: 'primary' | 'secondary';
}

export function VEmptyState({
  title,
  body,
  ctaLabel,
  onCta,
  icon,
  fill = false,
  ctaVariant = 'primary',
}: VEmptyStateProps) {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, motion.springGentle);
    opacity.value = withTiming(1, { duration: motion.timingBase });
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, fill && styles.fill, animatedStyle]}>
      {icon ? (
        <View style={styles.iconWrap}>
          {typeof icon === 'string' ? (
            <Text style={styles.iconText} accessibilityRole="image" accessibilityLabel={title}>
              {icon}
            </Text>
          ) : (
            icon
          )}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {ctaLabel && onCta ? (
        <View style={styles.ctaWrapper}>
          <VButton label={ctaLabel} onPress={onCta} variant={ctaVariant} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fill: { flex: 1 },
  iconWrap: {
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  iconText: { fontSize: 48 },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.snug,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  ctaWrapper: { marginTop: spacing.lg },
});
