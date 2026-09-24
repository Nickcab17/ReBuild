export const colors = {
  forest: '#23483A',
  forestDeep: '#17362D',
  sage: '#829B7A',
  sageLight: '#C9D8C1',
  terracotta: '#B9684B',
  clay: '#D89A78',
  sand: '#E7DCCB',
  cream: '#F5F1E8',
  charcoal: '#252A27',
  warmWhite: '#FCFAF5',
  background: '#F5F1E8',
  surface: '#FCFAF5',
  primary: '#23483A',
  primaryDark: '#17362D',
  secondary: '#B9684B',
  tertiary: '#E7DCCB',
  accent: '#C9D8C1',
  text: '#252A27',
  muted: '#5E655F',
  border: '#E4D8C5',
  success: '#2D6F5D',
  warning: '#D1A657',
  danger: '#C7614A',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
};

export const shadows = {
  soft: {
    shadowColor: '#17362D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: '#17362D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};

export const typography = {
  display: { fontFamily: 'Sora_800ExtraBold', fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -1.1 },
  h1: { fontFamily: 'Sora_800ExtraBold', fontSize: 32, lineHeight: 38, color: colors.text, letterSpacing: -0.8 },
  h2: { fontFamily: 'Sora_700Bold', fontSize: 24, lineHeight: 30, color: colors.text, letterSpacing: -0.5 },
  h3: { fontFamily: 'Sora_700Bold', fontSize: 18, lineHeight: 24, color: colors.text, letterSpacing: -0.2 },
  titleSm: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, lineHeight: 26, color: colors.text, letterSpacing: -0.6 },
  brandWordmark: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, lineHeight: 30, letterSpacing: 2.1, color: colors.text },
  body: { fontFamily: 'Sora_400Regular', fontSize: 15, lineHeight: 22, color: colors.text },
  bodyBold: { fontFamily: 'Sora_700Bold', fontSize: 15, lineHeight: 22, color: colors.text },
  bodyMuted: { fontFamily: 'Sora_500Medium', fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: 'Sora_700Bold', fontSize: 13, lineHeight: 18, color: colors.text },
  small: { fontFamily: 'Sora_500Medium', fontSize: 12, lineHeight: 18, color: colors.muted },
  tagline: { fontFamily: 'Sora_600SemiBold', fontSize: 10, lineHeight: 14, letterSpacing: 1.4, color: colors.muted, textTransform: 'uppercase' as const },
};

export const categories = [
  'Madera',
  'Metal',
  'Plástico',
  'Pintura',
  'Herramientas',
  'Material eléctrico',
  'Construcción',
  'Mobiliario',
  'Material escolar',
  'Otros',
];
