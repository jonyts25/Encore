import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useEncoreTheme } from '../theme';
import { minTouchTarget, radii, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

import { Glass } from './Glass';

type PillButtonVariant = 'primary' | 'secondary' | 'glass';

type PillButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: PillButtonVariant;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

export function PillButton({
  title,
  variant = 'primary',
  disabled,
  style,
  textColor,
  ...props
}: PillButtonProps) {
  const { tokens } = useEncoreTheme();

  const content = (
    <Text
      style={[
        typography.secondarySemibold,
        styles.label,
        variant === 'primary' && { color: '#FFFFFF' },
        variant === 'secondary' && { color: tokens.text },
        variant === 'glass' && { color: '#FFFFFF' },
        textColor ? { color: textColor } : null,
        disabled && styles.disabledText,
      ]}>
      {title}
    </Text>
  );

  if (variant === 'glass') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
        {...props}>
        <Glass style={styles.glassInner}>{content}</Glass>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor:
            variant === 'primary' ? tokens.accent : tokens.fillMuted,
          borderRadius: radii.pillLarge,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.xl,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    opacity: 0.7,
  },
  glassInner: {
    alignItems: 'center',
    borderRadius: radii.pillLarge,
    justifyContent: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  label: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.88,
  },
});
