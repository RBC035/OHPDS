import { useColorScheme } from 'react-native';
import { Colors, DarkColors } from '@/constants/colors';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  const theme = useColorScheme() ?? 'light';

  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  const palette =
    theme === 'dark'
      ? { ...Colors, ...DarkColors }
      : Colors;

  return palette[colorName];
}