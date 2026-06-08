import { Platform } from 'react-native';

// FONT FAMILY

export const FontFamily = {
  // Nunito — body / forms / buttons
  regular:     'Nunito-Regular',
  medium:      'Nunito-Medium',
  semiBold:    'Nunito-SemiBold',
  bold:        'Nunito-Bold',
  extraBold:   'Nunito-ExtraBold',

  // Poppins — headings only
  heading:     'Poppins-SemiBold',
  headingBold: 'Poppins-Bold',

  // Fallback
  system: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
} as const;

// FONT SIZES

export const FontSize = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   16,
  xl:   18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
} as const;

// LINE HEIGHTS

export const LineHeight = {
  xs:   16,
  sm:   18,
  base: 20,
  md:   22,
  lg:   24,
  xl:   28,
  '2xl': 30,
  '3xl': 34,
  '4xl': 40,
} as const;

// FONT WEIGHTS

export const FontWeight = {
  regular:  '400',
  medium:   '500',
  semiBold: '600',
  bold:     '700',
  extraBold:'800',
} as const;

// TYPOGRAPHY PRESETS

export const Typography = {
  hero: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    lineHeight: LineHeight['4xl'],
    fontWeight: FontWeight.bold,
  },

  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    lineHeight: LineHeight['3xl'],
    fontWeight: FontWeight.bold,
  },

  heading: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize['2xl'],
    lineHeight: LineHeight['2xl'],
    fontWeight: FontWeight.semiBold,
  },

  subHeading: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.semiBold,
  },

  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.regular,
  },

  bodyMedium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.medium,
  },

  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.regular,
  },

  button: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.bold,
  },
} as const;

export type FontSizeKey = keyof typeof FontSize;