import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { useTheme } from '@/constants';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost';

type ButtonSize =
  | 'sm'
  | 'md'
  | 'lg';

interface ButtonProps extends PressableProps {
  title: string;

  variant?: ButtonVariant;
  size?: ButtonSize;

  loading?: boolean;
  disabled?: boolean;

  fullWidth?: boolean;

  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,

  variant = 'primary',
  size = 'lg',

  loading = false,
  disabled = false,

  fullWidth = true,

  leftIcon,
  rightIcon,

  style,
  textStyle,

  ...props
}: ButtonProps) {
  const {
    colors,
    spacing,
    radius,
    shadows,
    typography,
    size: sizes,
    scale,
  } = useTheme();

  const getContainerStyles = (): ViewStyle[] => {
    const base: ViewStyle[] = [
      styles.base,
      {
        borderRadius: radius.lg,
        opacity: disabled ? 0.6 : 1,
      },
    ];

    // SIZE
    if (size === 'sm') {
      base.push({
        height: sizes.buttonHeightSm,
        paddingHorizontal: spacing[4],
      });
    }

    if (size === 'md') {
      base.push({
        height: sizes.buttonHeightMd,
        paddingHorizontal: spacing[5],
      });
    }

    if (size === 'lg') {
      base.push({
        height: sizes.buttonHeightLg,
        paddingHorizontal: spacing[6],
      });
    }

    // WIDTH
    if (fullWidth) {
      base.push({
        width: '100%',
      });
    }

    // VARIANTS
    switch (variant) {
      case 'primary':
        base.push(
          {
            backgroundColor: colors.primary,
          },
          shadows.button,
        );
        break;

      case 'secondary':
        base.push({
          backgroundColor: colors.primaryLight,
        });
        break;

      case 'outline':
        base.push({
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        });
        break;

      case 'ghost':
        base.push({
          backgroundColor: 'transparent',
        });
        break;
    }

    return base;
  };

  const getTextStyles = (): TextStyle[] => {
    const base: TextStyle[] = [
      typography.button,
      styles.text,
    ];

    switch (variant) {
      case 'primary':
        base.push({
          color: colors.textOnPrimary,
        });
        break;

      case 'secondary':
      case 'outline':
      case 'ghost':
        base.push({
          color: colors.primary,
        });
        break;
    }

    return base;
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        ...getContainerStyles(),
        {
          transform: [
            {
              scale: pressed
                ? scale.pressed
                : scale.normal,
            },
          ],
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary'
              ? colors.textOnPrimary
              : colors.primary
          }
        />
      ) : (
        <>
          {leftIcon}

          <Text
            style={[
              ...getTextStyles(),
              textStyle,
            ]}
          >
            {title}
          </Text>

          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  text: {
    textAlign: 'center',
  },
});