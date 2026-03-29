import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import { colors, typography, radii } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface VButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: { bg: colors.primary, text: colors.textPrimary, border: colors.primary },
  secondary: { bg: colors.surface, text: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', text: colors.primary, border: 'transparent' },
  destructive: { bg: colors.error, text: colors.textPrimary, border: colors.error },
};

const sizeStyles = {
  sm: { height: 36, fontSize: typography.sizes.sm, paddingH: 12 },
  md: { height: 48, fontSize: typography.sizes.md, paddingH: 20 },
  lg: { height: 56, fontSize: typography.sizes.lg, paddingH: 24 },
};

export function VButton({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: VButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          backgroundColor: v.bg,
          borderColor: v.border,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.label, { fontSize: s.fontSize, color: v.text }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
