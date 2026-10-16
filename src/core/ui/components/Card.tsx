import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useEncoreTheme } from '../theme';
import { radii, spacing } from '../theme/spacing';

type CardProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  radius?: 'card' | 'cardLarge';
};

export function Card({ style, padded = true, radius = 'card', children, ...props }: CardProps) {
  const { tokens } = useEncoreTheme();
  const borderRadius = radius === 'cardLarge' ? radii.cardLarge : radii.card;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderRadius,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});
