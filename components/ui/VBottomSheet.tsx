import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors, radii, spacing } from '@/lib/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Sheet starts off-screen
const CLOSED_Y = SCREEN_HEIGHT;

interface VBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[]; // % of screen height, e.g. [50, 90]
}

export function VBottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: VBottomSheetProps) {
  const translateY = useSharedValue(CLOSED_Y);
  const context = useSharedValue({ y: 0 });
  // visible tracks whether the component should be mounted at all
  const [visible, setVisible] = useState(isOpen);

  // Animate open/close — use withSpring callback to unmount only after animation completes
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      translateY.value = withSpring(0, { damping: 50 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 50 }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      });
    }
  }, [isOpen]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newY = context.value.y + event.translationY;
      // Only allow dragging down (positive Y), not above start
      translateY.value = Math.max(0, newY);
    })
    .onEnd((event) => {
      const shouldClose = event.translationY > 80 || event.velocityY > 500;
      if (shouldClose) {
        translateY.value = withSpring(SCREEN_HEIGHT, { damping: 50, stiffness: 300 });
        // runOnJS imported at top-level (dynamic require() is forbidden in worklets)
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 50, stiffness: 300 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    minHeight: 200,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingBottom: spacing.xl, // safe area buffer
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
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
    color: colors.textPrimary,
  },
  closeText: { fontSize: 17, color: colors.textSecondary },
  content: { paddingHorizontal: spacing.lg },
});
