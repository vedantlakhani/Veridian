import { View } from 'react-native';
import type { ReactNode } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/lib/theme';

// Must createAnimatedComponent before rendering
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface VProgressRingProps {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  animationDuration?: number;
  children?: ReactNode;
}

export function VProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.primary,
  trackColor = colors.divider,
  animationDuration = 800,
  children,
}: VProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // strokeDashoffset: 0 = full ring, circumference = empty ring
  const strokeDashoffset = useSharedValue(circumference);

  useEffect(() => {
    strokeDashoffset.value = withTiming(
      circumference * (1 - clamped),
      {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      },
    );
  }, [clamped]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated fill — rotated so progress starts from top */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      {/* Center content slot */}
      {children ? (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
