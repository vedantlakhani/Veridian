import { Text, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { colors, typography } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// VText — the typography enforcer. Every text element in Veridian goes through
// this component so hierarchy is consistent: weight contrast, letter-spacing,
// and monospace (tabular) numerals for anything quantitative.
// ─────────────────────────────────────────────────────────────────────────────

export type VTextVariant =
  | 'display'   // 56px heavy — the one big number on a screen
  | 'title'     // 22px bold — screen titles
  | 'heading'   // 16px bold — section headings
  | 'body'      // 14px regular — copy
  | 'label'     // 11px semibold uppercase wide — micro caps labels
  | 'mono'      // monospace tabular — quantitative values
  | 'monoLg'    // large monospace — hero metrics
  | 'caption';  // 12px secondary — timestamps, hints

interface VTextProps extends TextProps {
  variant?: VTextVariant;
  color?: string;
}

const variantStyles: Record<VTextVariant, TextStyle> = {
  display: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.heavy,
    letterSpacing: typography.letterSpacing.tight,
    color: colors.textPrimary,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.snug,
    color: colors.textPrimary,
  },
  heading: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.snug,
    color: colors.textPrimary,
  },
  body: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.textPrimary,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  mono: {
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  monoLg: {
    fontFamily: typography.fontFamilyMono,
    fontVariant: ['tabular-nums'],
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.snug,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },
};

export function VText({ variant = 'body', color, style, children, ...props }: VTextProps) {
  return (
    <Text
      style={[styles.base, variantStyles[variant], color ? { color } : null, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {},
});
