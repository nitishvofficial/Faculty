/**
 * Faculty Application - Elite UI/UX Design System Theme
 */

export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#4A90E2',
  primarySoft: '#BEE3F8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  divider: '#F1F5F9',
  white: '#FFFFFF',
  transparent: 'transparent',
};

export const typography = {
  fontFamily: 'Inter',
  sizes: {
    display: 32,
    heading: 28,
    title: 22,
    subtitle: 18,
    body: 16,
    caption: 14,
    small: 12,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const radius = {
  small: 12,
  medium: 16,
  large: 24,
  card: 24,
  button: 16,
  input: 16,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
};
