import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { colors, spacing, typography, radii } from '@/lib/theme';

// ─── Props ────────────────────────────────────────────────────────────────────
interface AchievementToastProps {
  achievementName: string;
  onDismiss: () => void;
}

// ─── AchievementToast Component ──────────────────────────────────────────────
/**
 * Slide-in toast notification for newly earned achievements.
 * Slides down from translateY -100 → 0, then back up after 3s total.
 * Uses Reanimated 3 withTiming + withDelay — never RN Animated API.
 */
export default function AchievementToast({ achievementName, onDismiss }: AchievementToastProps) {
  const translateY = useSharedValue(-100);

  useEffect(() => {
    // Slide in
    translateY.value = withTiming(0, { duration: 300 });
    // Slide back out after 2700ms (total 3000ms)
    translateY.value = withDelay(2700, withTiming(-100, { duration: 300 }));
    // Cleanup callback after full 3s
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 60,
          left: spacing.md,
          right: spacing.md,
          zIndex: 999,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: 12,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 20 }}>🏆</Text>
        <Text
          style={{
            marginLeft: 8,
            fontSize: typography.sizes.md,
            color: colors.surface,
            fontWeight: '600',
            flex: 1,
          }}
        >
          Badge unlocked: {achievementName}
        </Text>
      </View>
    </Animated.View>
  );
}
