import { useEffect, type ReactNode } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VStaggerIn — staggered entrance wrapper, first-mount only.
// Each child fades in + slides up with a delay based on its index.
// ─────────────────────────────────────────────────────────────────────────────

interface VStaggerInProps {
  index: number;
  children: ReactNode;
}

export function VStaggerIn({ index, children }: VStaggerInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(
      index * motion.staggerStep,
      withTiming(1, { duration: motion.timingBase }),
    );
    translateY.value = withDelay(
      index * motion.staggerStep,
      withSpring(0, motion.springGentle),
    );
  }, [index, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
