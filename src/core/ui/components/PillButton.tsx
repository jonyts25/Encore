import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useEncoreTheme } from '../theme';
import { minTouchTarget, radii, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

import { Glass } from './Glass';

type PillButtonVariant = 'primary' | 'secondary' | 'glass' | 'recording';

type PillButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: PillButtonVariant;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function PillButton({
  title,
  variant = 'primary',
  disabled,
  style,
  textColor,
  icon,
  ...props
}: PillButtonProps) {
  const { tokens } = useEncoreTheme();

  const labelColor =
    textColor ??
    (variant === 'secondary'
      ? tokens.text
      : variant === 'glass'
        ? tokens.onAccent
        : tokens.onAccent);

  const content = (
    <View style={styles.contentRow}>
      {icon ? <Ionicons color={labelColor} name={icon} size={20} /> : null}
      <Text
        style={[
          typography.secondarySemibold,
          styles.label,
          { color: labelColor },
          disabled && styles.disabledText,
        ]}>
        {title}
      </Text>
    </View>
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
            variant === 'recording'
              ? tokens.recording
              : variant === 'primary'
                ? tokens.accent
                : tokens.fillMuted,
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
  contentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
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
