import {
  colors,
  spacing,
  typography,
  shadows,
  theme,
  gradients,
  motion,
  budgetStateFor,
  budgetStateColors,
} from '@/lib/theme';

describe('theme', () => {
  it('exports colors with emerald primary', () => {
    expect(colors.primary).toBe('#00A862');
    expect(colors.primaryLight).toBe('#3DDC97');
  });

  it('exports near-black green-tinted background ramp', () => {
    expect(colors.background).toBe('#060A08');
    expect(colors.surface).toBe('#0D1210');
    expect(colors.surfaceElevated).toBe('#141B17');
    expect(colors.surfaceHigh).toBe('#1C2620');
  });

  it('exports spacing scale', () => {
    expect(spacing.xxs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(48);
  });

  it('exports a platform monospace font for quantitative values', () => {
    expect(typeof typography.fontFamilyMono).toBe('string');
    expect(typography.fontFamilyMono.length).toBeGreaterThan(0);
  });

  it('exports shadows with sm, md, lg and colored glows', () => {
    expect(shadows.sm).toBeDefined();
    expect(shadows.md).toBeDefined();
    expect(shadows.lg).toBeDefined();
    expect(shadows.glowPrimary.shadowColor).toBe('#00A862');
  });

  it('exports gradients and motion systems', () => {
    expect(gradients.primaryCTA).toHaveLength(3);
    expect(gradients.aurora).toHaveLength(3);
    expect(motion.pressScale).toBeCloseTo(0.97);
    expect(motion.staggerStep).toBe(50);
  });

  it('derives budget state from progress', () => {
    expect(budgetStateFor(0.2)).toBe('calm');
    expect(budgetStateFor(0.5)).toBe('watch');
    expect(budgetStateFor(1)).toBe('over');
    expect(budgetStateColors.calm.accent).toBe(colors.primaryLight);
    expect(budgetStateColors.over.accent).toBe(colors.danger);
  });

  it('theme object bundles all tokens', () => {
    expect(theme.colors).toBe(colors);
    expect(theme.spacing).toBe(spacing);
    expect(theme.gradients).toBe(gradients);
    expect(theme.motion).toBe(motion);
  });
});
