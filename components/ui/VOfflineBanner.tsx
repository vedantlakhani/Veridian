import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VIcon } from './VIcon';
import { colors, spacing, motion, typography } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VOfflineBanner — quiet neutral surface + wifi-off icon; measured-height
// slide so it never jumps by a guessed constant.
// ─────────────────────────────────────────────────────────────────────────────

interface VOfflineBannerProps {
  message?: string;
}

export function VOfflineBanner({
  message = 'You are offline — entries will sync when connected',
}: VOfflineBannerProps): React.ReactElement | null {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-48);
  const [measuredHeight, setMeasuredHeight] = useState(48);

  const isOffline = netInfo.isConnected === false;

  useEffect(() => {
    opacity.value = withTiming(isOffline ? 1 : 0, { duration: motion.timingBase });
    translateY.value = withTiming(isOffline ? 0 : -measuredHeight, {
      duration: motion.timingBase,
    });
  }, [isOffline, measuredHeight, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (netInfo.isConnected === null) return null;

  return (
    <Animated.View
      style={[styles.banner, { top: insets.top }, animatedStyle]}
      pointerEvents="none"
      onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height + insets.top)}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <VIcon name="wifi-off" size={14} color={colors.warning} strokeWidth={2} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.surfaceHigh,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
