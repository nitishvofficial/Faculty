import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { typography, colors } from '../theme/theme';

interface TypographyProps extends TextProps {
  variant?: 'display' | 'heading' | 'title' | 'subtitle' | 'body' | 'caption' | 'small';
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  weight,
  color = colors.textPrimary,
  align = 'left',
  style,
  children,
  ...rest
}) => {
  const defaultWeight = 
    variant === 'display' || variant === 'heading' ? 'bold' :
    variant === 'title' ? 'semiBold' :
    variant === 'subtitle' || variant === 'small' ? 'medium' : 'regular';

  const selectedWeight = weight || defaultWeight;

  return (
    <Text
      style={[
        {
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes[variant],
          fontWeight: typography.weights[selectedWeight],
          color,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
