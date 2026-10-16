import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEncoreTheme } from '../theme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  const { tokens } = useEncoreTheme();

  return (
    <View style={styles.row}>
      <Text style={[typography.title, { color: tokens.text, flex: 1 }]}>{title}</Text>
      {actionLabel && onActionPress ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onActionPress}>
          <Text style={[typography.secondary, { color: tokens.accentText }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
