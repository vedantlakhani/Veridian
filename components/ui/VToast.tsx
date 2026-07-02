import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, motion, shadows } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VToast — safe-area-aware, spring in, tap to dismiss, auto-dismiss.
// ─────────────────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'warning' | 'error' | 'neutral';

interface VToastProps {
  message: string;
  icon?: ReactNode;
  tone?: ToastTone;
  durationMs?: number;
  onDismiss: () => void;
}

const toneAccent: Record<ToastTone, string> = {
  success: colors.primaryLight,
  warning: colors.warning,
  error: colors.danger,
  neutral: colors.textSecondary,
};

export function VToast({
  message,
  icon,
  tone = 'success',
  durationMs = 3000,
  onDismiss,
}: VToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, motion.springBouncy);
    opacity.value = withTiming(1, { duration: motion.timingFast });
    // Auto-dismiss
    translateY.value = withDelay(
      durationMs - 300,
      withTiming(-120, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top + spacing.sm }, animatedStyle]}
      accessibilityLiveRegion="polite"
    >
      <Pressable onPress={onDismiss}>
        <View style={[styles.toast, { borderLeftColor: toneAccent[tone] }]}>
          {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderLeftWidth: 3,
    padding: spacing.md,
    ...shadows.lg,
  },
  iconSlot: {
    width: 22,
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
