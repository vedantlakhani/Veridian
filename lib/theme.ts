import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const colors = {
  // Backgrounds
  background:      '#F5F7F3',
  surface:         '#FFFFFF',
  surfaceElevated: '#ECEEED',
  surfaceHigh:     '#FFFFFF',

  // Borders
  border:          'rgba(0,0,0,0.08)',
  borderStrong:    'rgba(0,0,0,0.15)',

  // Track (rings / bars on light)
  trackOnDark:     'rgba(0,0,0,0.08)',

  // Primary — deep forest green
  primary:         '#1B6B42',
  primaryDeep:     '#134F31',
  primaryDim:      '#236B45',
  primaryGlow:     'rgba(27,107,66,0.14)',
  primaryGlowSoft: 'rgba(27,107,66,0.07)',
  primaryLight:    '#1B6B42',

  // Category colors — readable on white
  food:            '#C0392B',
  transport:       '#1A6FA8',
  energy:          '#C47D16',
  shopping:        '#7C5295',

  // Category bg tints
  foodGlow:        'rgba(192,57,43,0.07)',
  transportGlow:   'rgba(26,111,168,0.07)',
  energyGlow:      'rgba(196,125,22,0.07)',
  shoppingGlow:    'rgba(124,82,149,0.07)',

  // Budget-state system (light mode)
  glowCalm:        'rgba(27,107,66,0.07)',
  glowWatch:       'rgba(196,125,22,0.07)',
  glowOver:        'rgba(192,57,43,0.07)',

  successGlow:     'rgba(27,107,66,0.10)',
  warningGlow:     'rgba(196,125,22,0.10)',
  dangerGlow:      'rgba(192,57,43,0.10)',

  // Spend-based ("estimated") chip treatment — Sprint D. Deliberately NOT
  // successGlow/primary (that's reserved for celebratory zero-emission
  // "saved" chips) and NOT a plain unstyled kg value (that's the sensor-
  // measured convention) — a muted neutral pill so an estimate never reads
  // as a confident, precise sensor number (NORTH_STAR.md §5 — false
  // precision is a documented churn driver).
  estimatedGlow:   'rgba(92,114,101,0.12)',

  // Status
  success:         '#1B6B42',
  warning:         '#C47D16',
  warningBg:       '#FEF3C7',
  danger:          '#C0392B',

  // Text
  textPrimary:     '#111C16',
  textSecondary:   '#5C7265',
  textTertiary:    '#9EB5A4',

  // Legacy aliases
  primaryContainer: '#E2F0E8',
  error:            '#C0392B',
  errorLight:       '#FEE2E2',
  errorBorder:      '#FECACA',
  foodBg:           '#FEF2F0',
  transportBg:      '#EFF6FF',
  energyBg:         '#FFFBEB',
  shoppingBg:       '#F5F0F9',
  successBg:        '#F0FBF4',
  divider:          'rgba(0,0,0,0.08)',
  mist:             '#F5F7F3',
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
  calm:  { glow: colors.glowCalm,  accent: colors.primary,  ring: ['#2E9E62', '#1B6B42'] },
  watch: { glow: colors.glowWatch, accent: colors.warning,  ring: ['#E8A020', '#C47D16'] },
  over:  { glow: colors.glowOver,  accent: colors.danger,   ring: ['#E05246', '#C0392B'] },
} as const;

export const gradients = {
  primaryCTA:   ['#2E9E62', '#1B6B42', '#134F31'],
  ringCalm:     ['#2E9E62', '#1B6B42'],
  ringWatch:    ['#E8A020', '#C47D16'],
  ringOver:     ['#E05246', '#C0392B'],
  aurora:       ['#F5F7F3', '#EEF2EC', '#F5F7F3'],
  food:         ['#D4554A', '#C0392B'],
  transport:    ['#2E8FCC', '#1A6FA8'],
  energy:       ['#DFA030', '#C47D16'],
  shimmer:      ['transparent', 'rgba(0,0,0,0.03)', 'transparent'],
  cardSheen:    ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'],
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
  fontFamilyDefault: undefined as string | undefined,
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
    tight:   -0.8,
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
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  hero: {
    shadowColor: '#1B6B42',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  glowPrimary: {
    shadowColor: '#1B6B42',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  glowFood: {
    shadowColor: '#C0392B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  glowTransport: {
    shadowColor: '#1A6FA8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  glowEnergy: {
    shadowColor: '#C47D16',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
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
