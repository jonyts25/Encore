import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useEncoreTheme } from '../theme';

type GlassProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  interactive?: boolean;
};

export function Glass({ children, style, intensity = 40, interactive = false }: GlassProps) {
  const { resolvedScheme, tokens } = useEncoreTheme();

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        colorScheme={resolvedScheme === 'dark' ? 'dark' : 'light'}
        style={[styles.base, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.base, styles.fallbackBorder, { backgroundColor: tokens.glassFallback }, style]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? intensity : 80}
        tint={resolvedScheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  fallbackBorder: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
