import type { ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { colors, typography, radii, spacing } from '@/lib/theme';

interface VInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  required?: boolean;
}

export function VInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  required,
  style,
  ...props
}: VInputProps) {
  const hasError = Boolean(error);
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View style={[styles.inputRow, hasError && styles.inputError]}>
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, style]}
          placeholderTextColor={colors.textTertiary}
          {...props}
        />
        {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
      </View>

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
    color: '#374151',
  },
  required: { color: colors.error },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    height: '100%',
  },
  inputWithLeft: { paddingLeft: spacing.sm },
  iconSlot: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
