
export const Blue = {
  50:  '#EEF4FB',
  100: '#D6E8FA',
  200: '#A8C4DE',
  300: '#6FA8D8',
  400: '#378ADD',
  500: '#2B7FE8',
  600: '#1D6FD4',
  700: '#1456B3',
  800: '#0C447C',
  900: '#0F3F7E',
} as const;

export const Gray = {
  50:  '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
} as const;

export const Green = {
  50:  '#F0FDF4',
  100: '#DCFCE7',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
} as const;

export const Red = {
  50:  '#FFF1F2',
  100: '#FFE4E6',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
} as const;

export const Amber = {
  50:  '#FFFBEB',
  100: '#FEF3C7',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
} as const;

export const Purple = {
  50:  '#F5F3FF',
  100: '#EDE9FE',
  500: '#8B5CF6',
  600: '#7C3AED',
  700: '#6D28D9',
} as const;

export const Teal = {
  50:  '#F0FDFA',
  100: '#CCFBF1',
  500: '#14B8A6',
  600: '#0D9488',
  700: '#0F766E',
} as const;

export const Orange = {
  50:  '#FFF7ED',
  100: '#FFEDD5',
  500: '#F97316',
  600: '#EA580C',
  700: '#C2410C',
} as const;

// ────────────────
// ROLE COLORS
// ────────────────

export const RoleColors = {
  admin: {
    primary: Purple[500],
    light:   Purple[50],
    dark:    Purple[700],
  },
  teacher: {
    primary: Teal[500],
    light:   Teal[50],
    dark:    Teal[700],
  },
  parent: {
    primary: Orange[500],
    light:   Orange[50],
    dark:    Orange[700],
  },
} as const;

// ────────────────
// THEME TYPE
// ────────────────

export type ThemeColors = {
  // Brand
  primary:       string;
  primaryDark:   string;
  primaryLight:  string;
  primaryBorder: string;

  // Backgrounds
  background: string;
  surface:    string;
  surfaceAlt: string;

  // Text
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;
  textOnPrimary: string;

  // Borders
  border:       string;
  borderFocus:  string;
  borderStrong: string;

  // Semantic
  success:      string;
  successLight: string;
  error:        string;
  errorLight:   string;
  warning:      string;
  warningLight: string;

  // Tab Bar
  tabActive:     string;
  tabInactive:   string;
  tabBackground: string;

  // Role Colors
  roles: typeof RoleColors;

  // Gradients
  gradientPrimary: readonly [string, string];
  gradientLight:   readonly [string, string];

  // Soft background fills
  blueSoft:   string;
  blueMid:    string;
  orangeSoft: string;
  tealSoft:   string;
  violetSoft: string;
  greenSoft:  string;

  // Accent — strong shades for top bars & icon tints
  accentBlue:   string;
  accentOrange: string;
  accentTeal:   string;
  accentViolet: string;

  // Raw subject / feature colours
  blue:   string;
  orange: string;
  teal:   string;
  violet: string;
  green:  string;
  white:  string;
};

// ────────────────
// LIGHT THEME
// ────────────────

export const Colors: ThemeColors = {
  // Brand
  primary:       Blue[500],
  primaryDark:   Blue[700],
  primaryLight:  Blue[50],
  primaryBorder: Blue[100],

  // Backgrounds
  background: '#F8FAFF',
  surface:    '#FFFFFF',
  surfaceAlt: Gray[100],

  // Text
  textPrimary:   Gray[900],
  textSecondary: Gray[500],
  textMuted:     Gray[400],
  textOnPrimary: '#FFFFFF',

  // Borders
  border:       Gray[200],
  borderFocus:  Blue[500],
  borderStrong: Blue[200],

  // Semantic
  success:      Green[600],
  successLight: Green[50],
  error:        Red[500],
  errorLight:   Red[50],
  warning:      Amber[500],
  warningLight: Amber[50],

  // Tab Bar
  tabActive:     Blue[500],
  tabInactive:   Gray[400],
  tabBackground: '#FFFFFF',

  // Roles
  roles: RoleColors,

  // Gradients
  gradientPrimary: [Blue[700], Blue[500]],
  gradientLight:   [Blue[50],  '#FFFFFF'],

  // Soft fills
  blueSoft:   Blue[50],
  blueMid:    Blue[100],
  orangeSoft: Orange[50],
  tealSoft:   Teal[50],
  violetSoft: Purple[50],
  greenSoft:  Green[50],

  // Accents (strong shades for bars & icon tints)
  accentBlue:   '#185FA5',
  accentOrange: '#BA7517',
  accentTeal:   '#0F6E56',
  accentViolet: '#534AB7',

  // Raw subject / feature colours
  blue:   Blue[500],
  orange: Orange[500],
  teal:   Teal[600],
  violet: Purple[600],
  green:  Green[600],
  white:  '#FFFFFF',
};

// ────────────────
// DARK THEME OVERRIDES  (future use)
// ────────────────

export const DarkColors: Partial<ThemeColors> = {
  background: Gray[900],
  surface:    Gray[800],
  surfaceAlt: Gray[700],

  textPrimary:   '#FFFFFF',
  textSecondary: Gray[400],
  textMuted:     Gray[500],

  border:       Gray[700],
  borderStrong: Gray[600],

  tabBackground: Gray[900],
};

export type ColorKey = keyof ThemeColors;