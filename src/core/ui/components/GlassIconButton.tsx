import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { minTouchTarget } from '../theme/spacing';

import { Glass } from './Glass';

type GlassIconButtonProps = Omit<PressableProps, 'style'> & {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  accessibilityLabel: string;
};

export function GlassIconButton({
  icon,
  size = 20,
  accessibilityLabel,
  disabled,
  ...props
}: GlassIconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [styles.hit, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
      {...props}>
      <Glass style={styles.glass}>
        <Ionicons color="#FFFFFF" name={icon} size={size} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  glass: {
    alignItems: 'center',
    borderRadius: minTouchTarget / 2,
    height: minTouchTarget,
    justifyContent: 'center',
    width: minTouchTarget,
  },
  hit: {
    borderRadius: minTouchTarget / 2,
  },
  pressed: {
    opacity: 0.88,
  },
});
