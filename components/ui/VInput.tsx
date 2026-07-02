import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { VIcon } from './VIcon';
import { colors, typography, radii, spacing, motion } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VInput — animated focus border + glow, clearable, symmetric padding.
// ─────────────────────────────────────────────────────────────────────────────

interface VInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  required?: boolean;
  clearable?: boolean;
}

export function VInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  required,
  clearable = false,
  style,
  value,
  onChangeText,
  onFocus,
  onBlur,
  multiline,
  ...props
}: VInputProps) {
  const hasError = Boolean(error);
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: hasError
      ? colors.error
      : interpolateColor(
          focus.value,
          [0, 1],
          ['rgba(255,255,255,0.06)', colors.primary],
        ),
    shadowOpacity: focus.value * 0.25,
  }));

  const showClear = clearable && !!value && focused;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          hasError && styles.inputError,
          styles.focusShadow,
          animatedBorder,
        ]}
      >
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            (showClear || rightIcon) ? styles.inputWithRight : null,
            multiline && styles.inputMultiline,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: motion.timingFast });
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: motion.timingFast });
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {showClear ? (
          <Pressable
            onPress={() => onChangeText?.('')}
            style={styles.iconSlot}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear"
          >
            <VIcon name="close" size={14} color={colors.textTertiary} strokeWidth={2} />
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.iconSlot}>{rightIcon}</View>
        ) : null}
      </Animated.View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  required: { color: colors.error },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inputRowMultiline: {
    height: undefined,
    minHeight: 48,
    alignItems: 'flex-start',
  },
  focusShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
  inputError: {
    backgroundColor: colors.errorLight,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    height: '100%',
  },
  inputMultiline: {
    height: undefined,
    minHeight: 48,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  inputWithLeft: { paddingLeft: spacing.sm },
  inputWithRight: { paddingRight: spacing.sm },
  iconSlot: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontWeight: '500',
  },
  hintText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
});
