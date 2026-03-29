export const colors = {
  primary: '#006036',
  primaryLight: '#1B7A4A',
  primaryDark: '#004A29',
  primaryContainer: '#1B7A4A',
  secondary: '#006492',
  surface: '#1E2120',
  surfaceElevated: '#252B29',
  background: '#191C1C',
  mist: '#191C1C',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B8B4',
  textTertiary: '#6B7A76',
  error: '#DC2626',
  errorLight: '#2D0A0A',
  errorBorder: '#5C1A1A',
  warning: '#F59E0B',
  success: '#10B981',
  border: 'transparent',
  divider: '#2A302E',
  // Category colors
  food: '#F97316',
  transport: '#0EA5E9',
  energy: '#EAB308',
  foodBg: '#2D1A08',
  transportBg: '#0A1E2E',
  energyBg: '#1F1A00',
  successBg: '#0A1F12',
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
