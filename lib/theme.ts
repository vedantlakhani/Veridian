import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────────────────────
// UNDERSTORY — dark, editorial, forest-floor palette (Sprint F redesign).
// See docs/DESIGN_DIRECTION.md. Dark-first, matching the already-declared
// UIUserInterfaceStyle: Dark. Category hues retain their identity but are
// lifted ~15% in luminance so they read against the near-black "soil" bg.
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds — "soil" ramp (near-black, warm-green undertone)
  background:      '#0E1512',
  surface:         '#161F1A',
  surfaceElevated: '#1E2B23',
  surfaceHigh:     '#1E2B23',

  // Borders — hairlines on dark
  border:          'rgba(255,255,255,0.06)',
  borderStrong:    'rgba(255,255,255,0.12)',

  // Track (rings / bars on dark)
  trackOnDark:     'rgba(255,255,255,0.08)',

  // Primary — moss (brighter than the old #1B6B42 so it reads on dark)
  primary:         '#5FA876',
  primaryDeep:     '#3D7A54',
  primaryDim:      '#4E8F64',
  primaryGlow:     'rgba(95,168,118,0.16)',
  primaryGlowSoft: 'rgba(95,168,118,0.08)',
  primaryLight:    '#5FA876',

  // Accent — lichen light (amber warmth counterpoint, avoids all-green monotone)
  accentAmber:     '#E0B15C',

  // Category colors — hues retained, luminance lifted ~15% for dark-bg contrast
  food:            '#E0655A',
  transport:       '#4A97D1',
  energy:          '#E0A02E',
  shopping:        '#A87FC4',

  // Category bg tints (glows on dark)
  foodGlow:        'rgba(224,101,90,0.12)',
  transportGlow:   'rgba(74,151,209,0.12)',
  energyGlow:      'rgba(224,160,46,0.12)',
  shoppingGlow:    'rgba(168,127,196,0.12)',

  // Budget-state system (dark mode) — calm/watch/over retuned for dark surface
  glowCalm:        'rgba(95,168,118,0.12)',
  glowWatch:       'rgba(224,177,92,0.12)',
  glowOver:        'rgba(224,101,90,0.12)',

  successGlow:     'rgba(95,168,118,0.16)',
  warningGlow:     'rgba(224,177,92,0.16)',
  dangerGlow:      'rgba(224,101,90,0.16)',

  // Spend-based ("estimated") chip treatment — Sprint D. Deliberately NOT
  // successGlow/primary (that's reserved for celebratory zero-emission
  // "saved" chips) and NOT a plain unstyled kg value (that's the sensor-
  // measured convention) — a muted neutral pill so an estimate never reads
  // as a confident, precise sensor number (NORTH_STAR.md §5 — false
  // precision is a documented churn driver).
  estimatedGlow:   'rgba(155,168,158,0.14)',

  // Status
  success:         '#5FA876',
  warning:         '#E0B15C',
  warningBg:       'rgba(224,177,92,0.14)',
  danger:          '#E0655A',

  // Text — parchment, not pure white
  textPrimary:     '#F2F0E8',
  textSecondary:   '#9BA89E',
  textTertiary:    '#5E6B62',

  // Legacy aliases (retuned for dark)
  primaryContainer: 'rgba(95,168,118,0.16)',
  error:            '#E0655A',
  errorLight:       'rgba(224,101,90,0.14)',
  errorBorder:      'rgba(224,101,90,0.30)',
  foodBg:           'rgba(224,101,90,0.10)',
  transportBg:      'rgba(74,151,209,0.10)',
  energyBg:         'rgba(224,160,46,0.10)',
  shoppingBg:       'rgba(168,127,196,0.10)',
  successBg:        'rgba(95,168,118,0.12)',
  divider:          'rgba(255,255,255,0.06)',
  mist:             '#0E1512',
} as const;

export type BudgetState = 'calm' | 'watch' | 'over';

export function budgetStateFor(progress: number): BudgetState {
  if (progress >= 1) return 'over';
  if (progress >= 0.5) return 'watch';
  return 'calm';
}

export const budgetStateColors: Record<
  BudgetState,
  { glow: string; accent: string; ring: readonly [string, string] }
> = {
  calm:  { glow: colors.glowCalm,  accent: colors.primaryLight, ring: ['#6FB886', '#5FA876'] },
  watch: { glow: colors.glowWatch, accent: colors.warning,      ring: ['#E8C070', '#E0B15C'] },
  over:  { glow: colors.glowOver,  accent: colors.danger,       ring: ['#E8776A', '#E0655A'] },
} as const;

export const gradients = {
  primaryCTA:   ['#6FB886', '#5FA876', '#3D7A54'],
  ringCalm:     ['#6FB886', '#5FA876'],
  ringWatch:    ['#E8C070', '#E0B15C'],
  ringOver:     ['#E8776A', '#E0655A'],
  aurora:       ['#0E1512', '#161F1A', '#0E1512'],
  food:         ['#E8776A', '#E0655A'],
  transport:    ['#63A9DB', '#4A97D1'],
  energy:       ['#E8B14A', '#E0A02E'],
  shimmer:      ['transparent', 'rgba(255,255,255,0.04)', 'transparent'],
  cardSheen:    ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'],
} as const;

export const spacing = {
  xxs: 4,
  xs:  6,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  huge: 64,
} as const;

export const typography = {
  // Body/UI face — keep system default (San Francisco) for legibility and
  // platform-native feel. DESIGN_DIRECTION.md is explicit that ONLY hero/display
  // headline numbers use Fraunces; body/UI stays system default. This token is
  // referenced by ~20 body/UI styles today, so it must NOT be repointed to a serif.
  fontFamilyDefault: undefined as string | undefined,
  // Display/headline face — Fraunces, for hero numbers only (see fontFamilyDisplay
  // usage in redesigned hero components). Registered in app/_layout.tsx.
  fontFamilyDisplay: 'Fraunces_600SemiBold' as string,
  fontFamilyMono:    Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
  sizes: {
    xs:      11,
    sm:      12,
    md:      14,
    lg:      16,
    xl:      22,
    xxl:     32,
    display: 56,
    mega:    72,
  },
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    heavy:    '800' as const,
  },
  letterSpacing: {
    // Tighter tracking on large Fraunces headlines so serif type reads as
    // deliberate rather than default (DESIGN_DIRECTION.md typography).
    tight:   -1.2,
    snug:    -0.3,
    normal:   0,
    wide:     0.6,
    widest:   1.4,
  },
  lineHeights: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },
} as const;

export const motion = {
  springSnappy:  { damping: 28, stiffness: 350 },
  springGentle:  { damping: 18, stiffness: 160 },
  springBouncy:  { damping: 14, stiffness: 220 },
  timingFast:    180,
  timingBase:    280,
  timingSlow:    600,
  easeOut:       Easing.bezier(0.22, 1, 0.36, 1),
  easeHeartbeat: Easing.bezier(0.4, 0, 0.6, 1),
  pressScale:    0.97,
  staggerStep:   50,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    elevation: 5,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  // Card elevation via soft moss glow, not a light-mode drop shadow.
  hero: {
    shadowColor: '#5FA876',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 6,
  },
  glowPrimary: {
    shadowColor: '#5FA876',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  glowFood: {
    shadowColor: '#E0655A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  glowTransport: {
    shadowColor: '#4A97D1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  glowEnergy: {
    shadowColor: '#E0A02E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const radii = {
  xs:   6,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
} as const;

export const theme = { colors, spacing, typography, shadows, radii, gradients, motion } as const;
export type Theme = typeof theme;
