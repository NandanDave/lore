export const colors = {
  // Backgrounds
  background: '#000000',
  surface: '#0d0d0d',
  surfaceRaised: '#111111',
  border: '#1e1e1e',
  borderSubtle: '#141414',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#444444',

  // Domain colors
  domains: {
    Body: '#e05c5c',
    Mind: '#5c8ee0',
    Craft: '#e0a85c',
    Relationships: '#5ce07a',
    Wealth: '#a05ce0',
    Purpose: '#2ab8c4',
  },

  // Difficulty colors
  difficulty: {
    Easy: '#5ce07a',
    Medium: '#e0a85c',
    Hard: '#e05c5c',
  },

  // Semantic
  danger: '#e05c5c',
  success: '#5ce07a',
}

export const gradients = {
  background: {
    colors: ['#0d0a1a', '#000000'],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 0.6 },
  },
}

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 42,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  tracking: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 3,
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
}