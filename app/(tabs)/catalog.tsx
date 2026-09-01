import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PublicCatalogList } from '@/modules/catalog';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

export default function CatalogScreen() {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('catalog.title')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('catalog.subtitle')}</ThemedText>
      <PublicCatalogList />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subtitle: {
    opacity: 0.75,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
