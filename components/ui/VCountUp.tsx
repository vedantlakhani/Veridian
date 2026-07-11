import { useEffect, useState } from 'react';
import { TextInput, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, typography, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VCountUp — animated number. Numbers in Veridian never snap; they travel.
//
// Renders through plain React state (via useAnimatedReaction + runOnJS)
// rather than pushing the interpolated value straight to TextInput's native
// `value` prop through animatedProps. TextInput on the New Architecture
// tracks its own "most recent event count" for controlled updates and can
// silently ignore prop pushes that bypass a normal React commit — which
// left this number frozen at its initial value while UI-thread-only
// consumers (e.g. VProgressRing's SVG arc) animated correctly. Bridging
// back to state guarantees the render always reflects the animated target.
// ─────────────────────────────────────────────────────────────────────────────

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
  const [display, setDisplay] = useState(() => `${(0).toFixed(decimals)}${suffix}`);

  useEffect(() => {
    animated.value = withTiming(value, { duration, easing: motion.easeOut });
  }, [value, duration, animated]);

  useAnimatedReaction(
    () => animated.value,
    (current) => {
      runOnJS(setDisplay)(`${current.toFixed(decimals)}${suffix}`);
    },
    [decimals, suffix],
  );

  return (
    <TextInput
      editable={false}
      value={display}
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
