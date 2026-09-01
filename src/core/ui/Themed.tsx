import { Pressable, StyleSheet, Text, View, type PressableProps, type TextProps, type ViewProps } from 'react-native';

import Colors from '@/core/ui/theme/Colors';
import { useColorScheme } from '@/core/ui/useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedViewProps = ViewProps & ThemeProps;
export type ThemedTextProps = TextProps & ThemeProps;

export function useThemeColor(props: ThemeProps, colorName: keyof typeof Colors.light) {
  const theme = useColorScheme();
  const colorFromProps = props[theme === 'dark' ? 'darkColor' : 'lightColor'];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ lightColor, darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

export function ThemedText({ style, lightColor, darkColor, ...otherProps }: ThemedTextProps) {
  const color = useThemeColor({ lightColor, darkColor }, 'text');

  return <Text style={[{ color }, style]} {...otherProps} />;
}

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, variant = 'primary', disabled, style, ...props }: ButtonProps) {
  const theme = useColorScheme();
  const palette = Colors[theme];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary'
          ? { backgroundColor: palette.tint }
          : { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#ECECEC' },
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}>
      <Text
        style={[
          styles.buttonText,
          { color: variant === 'primary' ? '#FFFFFF' : palette.text },
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
