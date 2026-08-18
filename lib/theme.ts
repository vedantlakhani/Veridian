import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────────────────────
// CLEARING — light, precise, persona-led (design reboot, docs/DESIGN_DIRECTION.md).
// Supersedes Understory (dark, editorial, Fraunces). Model is Copilot Money, not
// Klima: a light instrument calm enough to trust with your bank account, exact
// enough to argue with. Canonical tokens follow the naming in DESIGN_DIRECTION.md
// §Color tokens. Legacy keys below (background, primary, textPrimary, …) are
// aliases onto the canonical values so the ~50 screens consuming `colors` today
// pick up the new palette without a synchronized rewrite — per-screen migration
// to canonical names happens in Phases 1–5, not here in Phase 0.
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Neutrals ──────────────────────────────────────────────────────────────
  canvas:        '#FCFCFD',
  surface:       '#FFFFFF',
  surfaceSunken: '#F4F5F7',
  border:        'rgba(13,17,23,0.08)',
  borderStrong:  'rgba(13,17,23,0.14)',
  ink:           '#0D1117',
  inkSecondary:  '#5A6470',
  inkTertiary:   '#8B95A1',

  // ── Accents — two-tier, per Klima's technique (DESIGN_DIRECTION.md) ────────
  accent:           '#0F6B41',
  accentSoft:       'rgba(15,107,65,0.08)',
  accentSecondary:  '#3D5A80',
  accentSecondarySoft: 'rgba(61,90,128,0.08)',

  // ── Semantic — separate from accent, per data-viz convention ───────────────
  calm:      '#0F6B41',
  watch:     '#B47714',
  over:      '#B0442F',
  estimated: '#8B95A1',

  // ── Category (charts, entry rows) — desaturated for a light ground ─────────
  food:      '#B0442F',
  transport: '#2C6E9B',
  energy:    '#B47714',
  shopping:  '#6B4E8C',

  // Category tints (light fills behind icons/rows, not glows)
  foodGlow:      'rgba(176,68,47,0.08)',
  transportGlow: 'rgba(44,110,155,0.08)',
  energyGlow:    'rgba(180,119,20,0.08)',
  shoppingGlow:  'rgba(107,78,140,0.08)',

  // Budget-state tints (ring track / row backgrounds)
  glowCalm:  'rgba(15,107,65,0.08)',
  glowWatch: 'rgba(180,119,20,0.08)',
  glowOver:  'rgba(176,68,47,0.08)',

  successGlow: 'rgba(15,107,65,0.10)',
  warningGlow: 'rgba(180,119,20,0.10)',
  dangerGlow:  'rgba(176,68,47,0.10)',

  // Spend-based ("estimated") chip treatment — deliberately neutral, never a
  // confident color, so an estimate never reads as a precise sensor value
  // (NORTH_STAR.md §5 — false precision is a documented churn driver).
  estimatedGlow: 'rgba(139,149,161,0.12)',

  // Status
  success:   '#0F6B41',
  warning:   '#B47714',
  warningBg: 'rgba(180,119,20,0.10)',
  danger:    '#B0442F',

  // ── Legacy aliases (Understory-era key names, retargeted to Clearing) ──────
  background:      '#FCFCFD',
  surfaceElevated: '#FFFFFF',
  surfaceHigh:     '#FFFFFF',

  // Progress-ring / bar track — was a light-on-dark hairline, now a light-on-
  // light one. Name kept for compatibility; value now reads on a white surface.
  trackOnDark: 'rgba(13,17,23,0.08)',

  primary:         '#0F6B41',
  primaryDeep:     '#0B5934',
  primaryDim:      '#3D8362',
  primaryGlow:     'rgba(15,107,65,0.16)',
  primaryGlowSoft: 'rgba(15,107,65,0.08)',
  primaryLight:    '#0F6B41',

  accentAmber: '#B47714',

  textPrimary:   '#0D1117',
  textSecondary: '#5A6470',
  textTertiary:  '#8B95A1',

  primaryContainer: 'rgba(15,107,65,0.08)',
  error:            '#B0442F',
  errorLight:       'rgba(176,68,47,0.10)',
  errorBorder:      'rgba(176,68,47,0.30)',
  foodBg:           'rgba(176,68,47,0.08)',
  transportBg:      'rgba(44,110,155,0.08)',
  energyBg:         'rgba(180,119,20,0.08)',
  shoppingBg:       'rgba(107,78,140,0.08)',
  successBg:        'rgba(15,107,65,0.08)',
  divider:          'rgba(13,17,23,0.08)',
  mist:             '#FCFCFD',
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
  calm:  { glow: colors.glowCalm,  accent: colors.calm,  ring: ['#17864F', '#0F6B41'] },
  watch: { glow: colors.glowWatch, accent: colors.watch, ring: ['#CE8B1C', '#B47714'] },
  over:  { glow: colors.glowOver,  accent: colors.over,  ring: ['#C55238', '#B0442F'] },
} as const;

export const gradients = {
  primaryCTA:   ['#17864F', '#0F6B41', '#0B5934'],
  ringCalm:     ['#17864F', '#0F6B41'],
  ringWatch:    ['#CE8B1C', '#B47714'],
  ringOver:     ['#C55238', '#B0442F'],
  aurora:       ['#FCFCFD', '#F4F5F7', '#FCFCFD'],
  food:         ['#C55238', '#B0442F'],
  transport:    ['#3A80B0', '#2C6E9B'],
  energy:       ['#CE8B1C', '#B47714'],
  shimmer:      ['transparent', 'rgba(13,17,23,0.04)', 'transparent'],
  cardSheen:    ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)'],
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
  // Body/UI face — system default (SF Pro on iOS). Clearing spends its
  // distinctiveness budget on spacing, tabular figures and illustration, not
  // an exotic display face (DESIGN_DIRECTION.md — Typography). No serif
  // anywhere in the product; this token is intentionally `undefined` so every
  // consumer falls through to the platform system font.
  fontFamilyDefault: undefined as string | undefined,
  fontFamilyDisplay: undefined as string | undefined,
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
  // Display tracking runs −4% to −6% of font size (Klima's ratio, adopted
  // verbatim per DESIGN_DIRECTION.md). Body sits at default tracking — the
  // contrast between tight display and normal body is the typographic system.
  letterSpacing: {
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
  // Signature motion: numbers settle with high damping and minimal overshoot —
  // an instrument doesn't bounce (DESIGN_DIRECTION.md — Motion). Understory's
  // bouncy count-up used damping:14/stiffness:220; this key name is kept for
  // compatibility but its values now match the Clearing spec exactly.
  springBouncy:  { damping: 30, stiffness: 220 },
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
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  card: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  // Hero elevation on a light ground reads as a soft neutral lift, not a
  // colored glow — glows were an Understory-on-dark device.
  hero: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  glowPrimary: {
    shadowColor: '#0F6B41',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  glowFood: {
    shadowColor: '#B0442F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  glowTransport: {
    shadowColor: '#2C6E9B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  glowEnergy: {
    shadowColor: '#B47714',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
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
