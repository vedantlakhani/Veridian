import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Fixed-position banner that appears at the top of the screen when the
 * device is offline and auto-dismisses when connectivity returns.
 *
 * Design: Forest Green (#1B7A4A) background, white text.
 * Animation: Reanimated 3 withTiming fade + slide on connectivity change.
 * Interaction: pointerEvents="none" — never blocks touches on content below.
 */
export function VOfflineBanner(): React.ReactElement | null {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  // All hooks must be called unconditionally before any early return
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-40);

  const isOffline = netInfo.isConnected === false;

  useEffect(() => {
    opacity.value = withTiming(isOffline ? 1 : 0, { duration: 300 });
    translateY.value = withTiming(isOffline ? 0 : -40, { duration: 300 });
  }, [isOffline, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // When isConnected is null (initial/unknown state), do not render the banner
  if (netInfo.isConnected === null) return null;

  return (
    <Animated.View
      style={[styles.banner, { top: insets.top }, animatedStyle]}
      pointerEvents="none"
    >
      <Text style={styles.text}>
        You are offline — entries will sync when connected
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#1B7A4A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
});
