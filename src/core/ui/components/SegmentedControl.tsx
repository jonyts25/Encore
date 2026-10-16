import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEncoreTheme } from '../theme';
import { radii, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  const { tokens, resolvedScheme } = useEncoreTheme();

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor:
            resolvedScheme === 'dark' ? 'rgba(118,118,128,0.24)' : tokens.separator,
        },
      ]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && {
                backgroundColor:
                  resolvedScheme === 'dark' ? 'rgba(255,255,255,0.22)' : tokens.surface,
              },
            ]}>
            <Text
              style={[
                typography.secondary,
                { color: selected ? tokens.text : tokens.textSecondary },
                selected && typography.secondarySemibold,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    alignItems: 'center',
    borderRadius: radii.control - 3,
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  track: {
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
});
