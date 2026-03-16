export const colors = {
  primary: '#1B7A4A',
  primaryLight: '#2DA661',
  primaryDark: '#145C38',
  surface: '#FFFFFF',
  background: '#F8FAF9',
  mist: '#F8FAF9',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',
  warning: '#F59E0B',
  success: '#10B981',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  // Category colors
  food: '#F97316',
  transport: '#3B82F6',
  energy: '#A855F7',
} as const;

export const spacing = {
  xs: 4,    // 1 grid unit
  sm: 8,    // 2 grid units
  md: 16,   // 4 grid units
  lg: 24,   // 6 grid units
  xl: 32,   // 8 grid units
  xxl: 48,  // 12 grid units
} as const;

export const typography = {
  fontFamilyDefault: 'Inter',
  fontFamilyMono: 'JetBrainsMono',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 28,
    display: 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const theme = { colors, spacing, typography, shadows, radii } as const;
export type Theme = typeof theme;
