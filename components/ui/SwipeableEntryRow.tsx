import type { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radii, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// SwipeableEntryRow — the single shared swipe-to-delete row. Replaces the
// duplicated implementations on the Log and Insights screens.
// ─────────────────────────────────────────────────────────────────────────────

const REVEAL_THRESHOLD = -60;
const DELETE_BUTTON_WIDTH = 80;

interface SwipeableEntryRowProps {
  children: ReactNode;
  onDelete: () => void;
  onPress?: () => void;
  /** Category accent bar on the left edge */
  accentColor?: string;
}

export function SwipeableEntryRow({
  children,
  onDelete,
  onPress,
  accentColor = colors.primary,
}: SwipeableEntryRowProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      translateX.value = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < REVEAL_THRESHOLD) {
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, motion.springSnappy);
      } else {
        translateX.value = withSpring(0, motion.springSnappy);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDelete = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.deleteButton}>
        <Pressable
          style={styles.deleteButtonInner}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete entry"
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>
          <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={[styles.rowCard, { borderLeftColor: accentColor }]}
          >
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm, position: 'relative' },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  deleteButtonInner: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
});
