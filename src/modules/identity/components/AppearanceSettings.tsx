import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { SegmentedControl } from '@/core/ui';
import { useEncoreTheme, type ThemePreference } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { preference, setPreference, tokens } = useEncoreTheme();

  return (
    <View style={styles.row}>
      <Text style={[typography.bodySemibold, { color: tokens.text, flex: 1 }]}>
        {t('settings.appearance')}
      </Text>
      <SegmentedControl<ThemePreference>
        options={[
          { value: 'system', label: t('settings.appearanceSystem') },
          { value: 'light', label: t('settings.appearanceLight') },
          { value: 'dark', label: t('settings.appearanceDark') },
        ]}
        value={preference}
        onChange={setPreference}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
