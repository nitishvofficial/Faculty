import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors, spacing, shadows } from '../theme/theme';
import { Shield } from 'lucide-react-native';
import { Typography } from '../components/Typography';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Splash'> };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('FaceScan');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Shield size={56} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Typography variant="heading" align="center" style={styles.title}>
          Academic Monitor
        </Typography>
        <Typography variant="subtitle" color={colors.textSecondary} align="center">
          Faculty Application
        </Typography>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  title: {
    marginBottom: spacing.xs,
  },
  footer: {
    paddingBottom: spacing.xxxl,
  },
});
