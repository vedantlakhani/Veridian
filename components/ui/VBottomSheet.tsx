import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VIcon } from './VIcon';
import { colors, radii, spacing, motion, typography } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VBottomSheet — snappy spring, backdrop fade synced to the sheet position,
// safe-area aware, drag-to-dismiss.
// ─────────────────────────────────────────────────────────────────────────────

interface VBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Called once the open spring has settled — drive content entrances from here */
  onOpened?: () => void;
}

export function VBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  onOpened,
}: VBottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(screenHeight);
  const context = useSharedValue({ y: 0 });
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      translateY.value = withSpring(0, motion.springSnappy, (finished) => {
        if (finished && onOpened) runOnJS(onOpened)();
      });
    } else {
      translateY.value = withSpring(screenHeight, motion.springSnappy, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, screenHeight]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newY = context.value.y + event.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((event) => {
      const shouldClose = event.translationY > 80 || event.velocityY > 500;
      if (shouldClose) {
        translateY.value = withSpring(screenHeight, motion.springSnappy);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, motion.springSnappy);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Backdrop opacity tracks the sheet position — always in sync
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, screenHeight], [1, 0]),
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: screenHeight * 0.9,
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {title ? (
            <>
              <View style={styles.titleRow}>
                <Text style={styles.titleText}>{title}</Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <VIcon name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.titleSeparator} />
            </>
          ) : null}

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,4,3,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceHigh,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    minHeight: 200,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: typography.letterSpacing.snug,
    color: colors.textPrimary,
  },
  titleSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  content: { paddingHorizontal: spacing.lg },
});
