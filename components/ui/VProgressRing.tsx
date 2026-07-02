import { View } from 'react-native';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VProgressRing — gradient arc stroke with soft glow arc underneath.
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface VProgressRingProps {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Two-stop gradient stroke; overrides color */
  gradient?: readonly [string, string];
  trackColor?: string;
  animationDuration?: number;
  /** Soft glow arc underneath */
  glow?: boolean;
  children?: ReactNode;
}

let ringCounter = 0;

export function VProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.primary,
  gradient,
  trackColor = colors.trackOnDark,
  animationDuration = 800,
  glow = false,
  children,
}: VProgressRingProps) {
  const gradientId = useMemo(() => `ring-${++ringCounter}`, []);
  const clamped = Math.max(0, Math.min(1, progress));

  const { radius, circumference, center } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    return { radius: r, circumference: 2 * Math.PI * r, center: size / 2 };
  }, [size, strokeWidth]);

  // strokeDashoffset: 0 = full ring, circumference = empty ring
  const strokeDashoffset = useSharedValue(circumference);

  useEffect(() => {
    strokeDashoffset.value = withTiming(circumference * (1 - clamped), {
      duration: animationDuration,
      easing: motion.easeOut,
    });
  }, [clamped, circumference, animationDuration, strokeDashoffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const strokeColor = gradient ? `url(#${gradientId})` : color;
  const glowColor = gradient ? gradient[0] : color;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {gradient ? (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Glow arc — wider, translucent, sits under the crisp arc */}
        {glow && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={glowColor}
            strokeWidth={strokeWidth * 2.5}
            strokeOpacity={0.25}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={glowProps}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />
        )}
        {/* Animated fill — rotated so progress starts from top */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
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
