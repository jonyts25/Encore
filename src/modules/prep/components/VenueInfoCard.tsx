import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';
import type { VenueSummary } from '@/modules/events';

type VenueInfoCardProps = {
  venue: VenueSummary;
};

export function VenueInfoCard({ venue }: VenueInfoCardProps) {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.sectionLabel}>{t('prep.venue.title')}</ThemedText>
      <ThemedText style={styles.name}>{venue.name}</ThemedText>
      <ThemedText style={styles.location}>
        {venue.city}, {venue.country}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F7FB',
    borderRadius: 16,
    gap: 4,
    padding: 16,
  },
  location: {
    fontSize: 16,
    opacity: 0.85,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
});
