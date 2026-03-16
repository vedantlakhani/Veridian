import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, radii } from '@/lib/theme';

interface VProgressBarProps {
  /** 0 to 1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  animationDuration?: number;
}

export function VProgressBar({
  progress,
  color = colors.primary,
  trackColor = colors.divider,
  height = 8,
  animationDuration = 600,
}: VProgressBarProps) {
  // Clamp progress 0-1
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, height, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: {},
});
