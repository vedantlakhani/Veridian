import { useEffect } from 'react';
import { StyleSheet, View, type TextStyle, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { VCountUp } from './VCountUp';
import { colors, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VHeroCountUp — Understory's signature "hero" motion (DESIGN_DIRECTION.md
// §Motion): the footprint number counts up, then a spring overshoot settles
// it into place while a brief primaryGlow pulse breathes behind it. Reserved
// for the one big number per screen (recap/passport hero totals, the daily
// story-card total) — everything else stays a plain VCountUp.
// ─────────────────────────────────────────────────────────────────────────────

interface VHeroCountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  /** Re-triggers the overshoot + glow pulse — pass a value that changes per "story" (e.g. page index or period key). */
  pulseKey?: string | number;
  glowStyle?: StyleProp<ViewStyle>;
}

export function VHeroCountUp({
  value,
  decimals = 1,
  duration = motion.timingSlow,
  suffix = '',
  style,
  pulseKey,
  glowStyle,
}: VHeroCountUpProps) {
  const scale = useSharedValue(0.9);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Spring overshoot on the number itself as the count-up settles.
    scale.value = withSequence(
      withTiming(0.94, { duration: Math.max(duration - 150, 0) }),
      withSpring(1, motion.springBouncy),
    );
    // A brief primaryGlow breath behind the number.
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 220 }),
      withSpring(0.35, motion.springGentle),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseKey, value, duration]);

  const numberAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, glowStyle, glowAnimStyle]}
      />
      <Animated.View style={numberAnimStyle}>
        <VCountUp value={value} decimals={decimals} duration={duration} suffix={suffix} style={style} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    borderRadius: 999,
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
});
