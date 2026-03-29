import { colors, spacing, typography, shadows, theme } from '@/lib/theme';

describe('theme', () => {
  it('exports colors with primary green', () => {
    expect(colors.primary).toBe('#006036');
  });

  it('exports background mist color', () => {
    expect(colors.background).toBe('#191C1C');
  });

  it('exports spacing on 4px grid', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(48);
  });

  it('exports typography with Inter and JetBrainsMono families', () => {
    expect(typography.fontFamilyDefault).toBe('Inter');
    expect(typography.fontFamilyMono).toBe('JetBrainsMono');
  });

  it('exports shadows with sm, md, lg', () => {
    expect(shadows.sm).toBeDefined();
    expect(shadows.md).toBeDefined();
    expect(shadows.lg).toBeDefined();
  });

  it('theme object bundles all tokens', () => {
    expect(theme.colors).toBe(colors);
    expect(theme.spacing).toBe(spacing);
  });
});
