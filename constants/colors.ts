/**
 * Paleta de colores basada en vinotinto
 * Color principal: #722F37 (vinotinto/burgundy)
 */

export const colors = {
  // Colores principales
  primary: {
    50: '#fdf2f2',
    100: '#fce6e6',
    200: '#f9d0d0',
    300: '#f4a8a8',
    400: '#ed7777',
    500: '#e14d4d',
    600: '#c92f2f',
    700: '#a82525',
    800: '#8b2222', // Vinotinto principal
    900: '#722F37', // Vinotinto oscuro
    950: '#4a1a1a',
  },
  
  // Colores secundarios (complementarios al vinotinto)
  secondary: {
    50: '#faf5f0',
    100: '#f3e8d8',
    200: '#e6d0b0',
    300: '#d6b17e',
    400: '#c48d4d',
    500: '#b8752e',
    600: '#a85f24',
    700: '#8b4a1f',
    800: '#723d1e',
    900: '#5e331b',
    950: '#32190d',
  },
  
  // Colores neutros
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // Estados
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
} as const;

// Colores semánticos para uso en la aplicación
export const semanticColors = {
  background: {
    primary: colors.neutral[50],
    secondary: colors.neutral[100],
    dark: colors.neutral[900],
  },
  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[600],
    light: colors.neutral[400],
    inverse: colors.neutral[50],
  },
  border: {
    default: colors.neutral[200],
    hover: colors.neutral[300],
    focus: colors.primary[600],
  },
} as const;
