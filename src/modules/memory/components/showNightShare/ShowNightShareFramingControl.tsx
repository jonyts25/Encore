import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';

import type { ShowNightShareContentAnchor } from '../../showNightShareMediaPreference';

type Props = {
  value: ShowNightShareContentAnchor;
  onChange: (anchor: ShowNightShareContentAnchor) => void;
};

const OPTIONS: ShowNightShareContentAnchor[] = ['top', 'center', 'bottom'];

export function ShowNightShareFramingControl({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();

  const labelFor = (anchor: ShowNightShareContentAnchor) => {
    if (anchor === 'top') return t('showNightShare.framing.top');
    if (anchor === 'bottom') return t('showNightShare.framing.bottom');
    return t('showNightShare.framing.center');
  };

  return (
    <View style={styles.row}>
      {OPTIONS.map((anchor, index) => {
        const selected = value === anchor;
        return (
          <View key={anchor} style={styles.itemWrap}>
            {index > 0 ? (
              <Text style={[typography.body, styles.sep, { color: tokens.textSecondary }]}>·</Text>
            ) : null}
            <Pressable onPress={() => onChange(anchor)}>
              <Text
                style={[
                  typography.bodySemibold,
                  {
                    color: selected ? tokens.accent : tokens.textSecondary,
                    opacity: selected ? 1 : 0.85,
                  },
                ]}>
                {labelFor(anchor)}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginTop: 10,
  },
  itemWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sep: {
    marginHorizontal: 2,
  },
});
