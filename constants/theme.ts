
import { useColorScheme } from 'react-native';

import { Colors, DarkColors } from './colors';

import {
  FontFamily,
  FontSize,
  FontWeight,
  LineHeight,
  Typography,
} from './typography';

import { IconSize } from './icons';

import {
  AnimationDuration,
  ScaleAnimation,
} from './animations';

// SPACING

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

// BORDER RADIUS

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
} as const;

// SHADOWS

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  xs: {
    shadowColor: '#1456B3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  sm: {
    shadowColor: '#1456B3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  md: {
    shadowColor: '#1456B3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  lg: {
    shadowColor: '#1456B3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },

  button: {
    shadowColor: '#2B7FE8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// COMPONENT SIZES

export const ComponentSize = {
  buttonHeightSm: 40,
  buttonHeightMd: 48,
  buttonHeightLg: 54,

  inputHeight: 50,
  inputHeightSm: 42,

  avatarXs: 28,
  avatarSm: 36,
  avatarMd: 44,
  avatarLg: 56,
  avatarXl: 80,

  tabBarHeight: 64,
  tabIconSize: 24,

  headerHeight: 56,

  courseCardWidth: 160,
  courseCardHeight: 180,
} as const;

// Z INDEX

export const ZIndex = {
  base: 1,
  dropdown: 100,
  sticky: 500,
  overlay: 1000,
  modal: 2000,
  toast: 3000,
} as const;

// COMMON STYLES

export const CommonStyles = (colors = Colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  safeContent: {
    flex: 1,
    paddingHorizontal: Spacing[4],
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[4],
    ...Shadows.sm,
  },

  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing[3],
  },

  sectionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: colors.textPrimary,
  },

  viewAll: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: colors.primary,
  },

  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: Spacing[4],
  },

  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    alignSelf: 'flex-start' as const,
  },

  centered: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: Spacing[8],
  },
} as const);

// THEME HOOK

export function useTheme() {
  const scheme = useColorScheme();

  const isDark = scheme === 'dark';

  const colors = isDark
    ? { ...Colors, ...DarkColors }
    : Colors;

  return {
    colors,
    isDark,

    typography: Typography,

    fonts: FontFamily,
    fontSize: FontSize,
    fontWeight: FontWeight,
    lineHeight: LineHeight,

    spacing: Spacing,
    radius: Radius,

    shadows: Shadows,
    size: ComponentSize,

    icons: IconSize,

    zIndex: ZIndex,

    animation: AnimationDuration,
    scale: ScaleAnimation,

    common: CommonStyles(colors),
  };
}

// TYPES

export type Theme = ReturnType<typeof useTheme>;

export type SpacingKey = keyof typeof Spacing;
export type RadiusKey = keyof typeof Radius;
export type ShadowKey = keyof typeof Shadows;

export { FontFamily, FontSize, Colors };
