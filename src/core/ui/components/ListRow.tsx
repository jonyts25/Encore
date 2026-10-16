import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useEncoreTheme } from '../theme';
import { minTouchTarget, radii, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type ListRowProps = {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  selected,
  style,
  subtitleColor,
}: ListRowProps) {
  const { tokens } = useEncoreTheme();

  const body = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textBlock}>
        <Text style={[typography.bodySemibold, { color: tokens.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[typography.footnote, { color: subtitleColor ?? tokens.textSecondary }]}
            numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );

  const rowStyle = [
    styles.row,
    selected && { backgroundColor: `${tokens.accent}33` },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{body}</View>;
}

const styles = StyleSheet.create({
  leading: {
    minWidth: 28,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    alignItems: 'center',
    borderRadius: radii.control + 2,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
