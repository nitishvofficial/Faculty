import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { colors, radius, spacing } from '../theme/theme';

export type StatusType = 'verified' | 'pending' | 'failed' | 'info';

interface StatusChipProps {
  status: StatusType;
  label: string;
  style?: ViewStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, style }) => {
  const getColors = () => {
    switch (status) {
      case 'verified':
        return { bg: '#DCFCE7', text: colors.success }; // Tailwind Green 100 / Success
      case 'failed':
        return { bg: '#FEE2E2', text: colors.error }; // Tailwind Red 100 / Error
      case 'pending':
        return { bg: '#FEF3C7', text: colors.warning }; // Tailwind Amber 100 / Warning
      case 'info':
      default:
        return { bg: colors.primarySoft, text: colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      <Typography variant="small" weight="semiBold" color={text}>
        {label}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.small,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
