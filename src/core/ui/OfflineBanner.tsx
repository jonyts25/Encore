import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';

import { ThemedText, ThemedView } from './Themed';

type OfflineBannerProps = {
  visible: boolean;
};

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <ThemedView style={styles.banner}>
      <ThemedText style={styles.text}>{t('offline.banner')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(120, 120, 120, 0.15)',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    fontSize: 13,
    opacity: 0.85,
    textAlign: 'center',
  },
});
