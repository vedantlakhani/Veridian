import { useEffect } from 'react';
import { TextInput, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VCountUp — animated number. Numbers in Veridian never snap; they travel.
// Uses the AnimatedTextInput.animatedProps pattern (UI-thread text updates).
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface VCountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}

export function VCountUp({
  value,
  decimals = 1,
  duration = motion.timingSlow,
  suffix = '',
  style,
}: VCountUpProps) {
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, { duration, easing: motion.easeOut });
  }, [value, duration, animated]);

  const animatedProps = useAnimatedProps(() => ({
    value: `${animated.value.toFixed(decimals)}${suffix}`,
  }));

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={`${(0).toFixed(decimals)}${suffix}`}
      animatedProps={animatedProps}
      style={[styles.text, style]}
      accessibilityLabel={`${value.toFixed(decimals)}${suffix}`}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 0,
  },
});
