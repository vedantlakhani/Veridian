import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VPressable — every tappable surface in Veridian. Spring press-scale plus
// optional haptic tick. This one component is 40% of "premium feel".
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticStrength = 'light' | 'medium' | 'success';

interface VPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: HapticStrength;
  /** Scale on press — defaults to motion.pressScale (0.97) */
  pressScale?: number;
}

function fireHaptic(strength: HapticStrength) {
  switch (strength) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
  }
}

export function VPressable({
  style,
  haptic,
  pressScale = motion.pressScale,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...props
}: VPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(pressScale, motion.springSnappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.springSnappy);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) fireHaptic(haptic);
        onPress?.(e);
      }}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
