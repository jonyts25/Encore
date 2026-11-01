import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import { SHARE_NIGHT, SHARE_NIGHT_FONTS } from '../../showNightShareTheme';

export function ShowNightShareWatermark() {
  const { t } = useTranslation();
  const label = t('common.appName').toLowerCase();

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  text: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 26,
    letterSpacing: 1.2,
    opacity: 0.7,
    textAlign: 'center',
  },
});
