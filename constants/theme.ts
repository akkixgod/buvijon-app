import { Colors } from './colors';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,   // section gap per design doc
  xl: 32,
  xxl: 48,
  label: 12, // gap between label and card
  // Legacy aliases kept for compatibility
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 20,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
  // Legacy aliases kept for compatibility
  xsmall: 8,
  small: 8,
  medium: 12,
  large: 16,
};

export const FontSize = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const FontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  heavy:    '800' as const,
};

export const Typography = {
  h3: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold } as const,
  body: { fontSize: FontSize.md, fontWeight: FontWeight.regular } as const,
  small: { fontSize: FontSize.sm, fontWeight: FontWeight.regular } as const,
};

export { Colors };

export const TAB_BAR_HEIGHT = 56;

export const Shadow = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
};
