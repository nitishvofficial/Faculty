import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '../theme/theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'flat';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = spacing.lg,
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding },
        variant === 'elevated' && shadows.card,
        variant === 'default' && shadows.soft,
        variant === 'flat' && { elevation: 0, shadowOpacity: 0, borderWidth: 1, borderColor: colors.border },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    width: '100%',
  },
});
