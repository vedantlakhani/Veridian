import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, radii } from '@/lib/theme';

interface VSkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
}

export function VSkeleton({
  width,
  height,
  borderRadius = radii.sm,
}: VSkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 700 }),
        withTiming(1,    { duration: 700 }),
      ),
      -1,    // infinite repeats
      false, // no reverse (withSequence handles it)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        animatedStyle,
      ]}
    />
  );
}
