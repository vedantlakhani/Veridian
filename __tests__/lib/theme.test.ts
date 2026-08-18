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
  // Palette pins updated for the Clearing light redesign (docs/DESIGN_DIRECTION.md)
  // — deep evergreen accent on a near-white "canvas" ground, superseding Understory.
  it('exports colors with evergreen primary', () => {
    expect(colors.primary).toBe('#0F6B41');
    expect(colors.primaryLight).toBe('#0F6B41');
    expect(colors.accent).toBe('#0F6B41');
  });

  it('exports a light canvas background ramp', () => {
    expect(colors.background).toBe('#FCFCFD');
    expect(colors.canvas).toBe('#FCFCFD');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.surfaceElevated).toBe('#FFFFFF');
    expect(colors.surfaceHigh).toBe('#FFFFFF');
    expect(colors.surfaceSunken).toBe('#F4F5F7');
  });

  it('exports navy-black ink, never pure black', () => {
    expect(colors.textPrimary).toBe('#0D1117');
    expect(colors.ink).toBe('#0D1117');
    expect(colors.ink).not.toBe('#000000');
  });

  it('exports spacing scale', () => {
    expect(spacing.xxs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(48);
  });

  it('has no serif display face — system font only', () => {
    expect(typography.fontFamilyDisplay).toBeUndefined();
    expect(typography.fontFamilyDefault).toBeUndefined();
  });

  it('exports a platform monospace font for quantitative values', () => {
    expect(typeof typography.fontFamilyMono).toBe('string');
    expect(typography.fontFamilyMono.length).toBeGreaterThan(0);
  });

  it('exports shadows with sm, md, lg and accent-tinted glows', () => {
    expect(shadows.sm).toBeDefined();
    expect(shadows.md).toBeDefined();
    expect(shadows.lg).toBeDefined();
    expect(shadows.glowPrimary.shadowColor).toBe(colors.accent);
  });

  it('exports gradients and motion systems', () => {
    expect(gradients.primaryCTA).toHaveLength(3);
    expect(gradients.aurora).toHaveLength(3);
    expect(motion.pressScale).toBeCloseTo(0.97);
    expect(motion.staggerStep).toBe(50);
  });

  it('numbers settle with high damping and minimal overshoot, not a bounce', () => {
    expect(motion.springBouncy.damping).toBe(30);
    expect(motion.springBouncy.stiffness).toBe(220);
  });

  it('derives budget state from progress', () => {
    expect(budgetStateFor(0.2)).toBe('calm');
    expect(budgetStateFor(0.5)).toBe('watch');
    expect(budgetStateFor(1)).toBe('over');
    expect(budgetStateColors.calm.accent).toBe(colors.primaryLight);
    expect(budgetStateColors.over.accent).toBe(colors.danger);
  });

  it('keeps over-budget as clay, not alarm-red', () => {
    expect(colors.over).toBe('#B0442F');
    expect(colors.danger).toBe('#B0442F');
  });

  it('theme object bundles all tokens', () => {
    expect(theme.colors).toBe(colors);
    expect(theme.spacing).toBe(spacing);
    expect(theme.gradients).toBe(gradients);
    expect(theme.motion).toBe(motion);
  });
});
