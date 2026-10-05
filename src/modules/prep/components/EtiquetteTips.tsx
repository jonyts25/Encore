import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { getEtiquetteTips } from '../content/etiquette';
import type { VenueKind } from '../types';

type EtiquetteTipsProps = {
  venueKind: VenueKind;
};

export function EtiquetteTips({ venueKind }: EtiquetteTipsProps) {
  const { t } = useTranslation();
  const tips = getEtiquetteTips(venueKind);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.sectionLabel}>{t('prep.etiquette.title')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('prep.etiquette.subtitle')}</ThemedText>
      <ThemedText style={styles.venueKind}>{t(`prep.venueKind.${venueKind}`)}</ThemedText>

      <ThemedView style={styles.tipList}>
        {tips.map((tip) => (
          <ThemedView key={tip.id} style={styles.tipRow}>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <ThemedText style={styles.tipText}>{t(tip.messageKey)}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bullet: {
    fontSize: 18,
    lineHeight: 22,
    opacity: 0.6,
  },
  container: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
  },
  tipList: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  venueKind: {
    fontSize: 15,
    fontWeight: '600',
  },
});
