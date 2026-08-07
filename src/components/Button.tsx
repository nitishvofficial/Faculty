import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';
import { Typography } from './Typography';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'danger';
  title: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  title,
  loading = false,
  icon,
  style,
  disabled,
  ...rest
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    if (isPrimary) return colors.primary;
    if (isDanger) return colors.error;
    return colors.surface;
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    if (isSecondary) return colors.textPrimary;
    return colors.white;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        isSecondary && styles.secondaryBorder,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && <View style={{ marginRight: spacing.xs }}>{icon}</View>}
          <Typography
            variant="body"
            weight="semiBold"
            color={getTextColor()}
            align="center"
          >
            {title}
          </Typography>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
    flexDirection: 'row',
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
