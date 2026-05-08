export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:      '#0B0F0D',   // true near-black, green undertone
  surface:         '#131815',   // cards — lifted from background
  surfaceElevated: '#1A201C',   // second-tier (hover, selected)
  surfaceHigh:     '#222A26',   // top-tier (bottom sheets, modals)

  // ── Borders ───────────────────────────────────────────────────────────────
  border:          'rgba(255,255,255,0.06)',   // every card hairline
  borderStrong:    'rgba(255,255,255,0.12)',   // active inputs, focus states

  // ── Brand / Primary ───────────────────────────────────────────────────────
  primary:         '#00A862',   // Klima emerald — alive on dark
  primaryDeep:     '#004D2E',   // gradient bottom, deep fills
  primaryGlow:     'rgba(0,168,98,0.24)',
  primaryLight:    '#3DDC97',   // highlights, success ticks, active labels

  // ── Category colors ───────────────────────────────────────────────────────
  food:            '#FF8A4C',   // warm coral
  transport:       '#5AC8FA',   // desaturated blue
  energy:          '#FFCC4D',   // soft gold

  // ── Status ────────────────────────────────────────────────────────────────
  success:         '#3DDC97',
  warning:         '#FFB547',
  danger:          '#FF5C5C',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary:     '#F2F5F3',   // off-white — easier on eyes
  textSecondary:   '#8A938E',   // muted mid
  textTertiary:    '#5A625E',   // units, timestamps, micro caps

  // ── Legacy aliases (keep for compat, map to new) ──────────────────────────
  primaryContainer: '#1A201C',
  error:            '#FF5C5C',
  errorLight:       '#2D0A0A',
  errorBorder:      '#5C1A1A',
  foodBg:           '#2D1A08',
  transportBg:      '#0A1E2E',
  energyBg:         '#1F1A00',
  successBg:        '#0A1F12',
  divider:          'rgba(255,255,255,0.06)',
  mist:             '#0B0F0D',
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
  fontFamilyDefault: 'Inter',
  fontFamilyMono:    'JetBrainsMono',
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

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  hero: {
    shadowColor: '#00A862',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
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

export const theme = { colors, spacing, typography, shadows, radii } as const;
export type Theme = typeof theme;
