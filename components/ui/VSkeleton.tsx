import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radii, gradients } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VSkeleton — gradient shimmer traveling across a surfaceHigh base.
// ─────────────────────────────────────────────────────────────────────────────

interface VSkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function VSkeleton({
  width,
  height,
  borderRadius = radii.sm,
  circle = false,
  style,
}: VSkeletonProps) {
  const shimmer = useSharedValue(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1000 }), -1, false);
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -measuredWidth + shimmer.value * measuredWidth * 2 },
    ],
  }));

  const radius = circle ? height / 2 : borderRadius;

  return (
    <View
      style={[
        {
          width: circle ? height : width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceHigh,
          overflow: 'hidden',
        },
        style,
      ]}
      onLayout={(e) => setMeasuredWidth(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
    >
      {measuredWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFillObject, shimmerStyle]}>
          <LinearGradient
            colors={gradients.shimmer}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      )}
    </View>
  );
}
