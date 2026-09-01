import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';
import { fetchShowById, useShowStatus, type Show } from '@/modules/events';

import { EtiquetteTips } from './EtiquetteTips';
import { PrepChecklist } from './PrepChecklist';
import { ShowCountdown } from './ShowCountdown';
import { VenueInfoCard } from './VenueInfoCard';
import { inferVenueKind } from '../utils/venue-kind';

type ShowPrepSectionProps = {
  showId: string;
};

export function ShowPrepSection({ showId }: ShowPrepSectionProps) {
  const { t } = useTranslation();
  const { status, isLoading: isStatusLoading } = useShowStatus(showId);
  const [show, setShow] = useState<Show | null>(null);
  const [isShowLoading, setIsShowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGoing = status === 'voy';

  const loadShow = useCallback(async () => {
    if (!isGoing) {
      setShow(null);
      setError(null);
      return;
    }

    setIsShowLoading(true);
    setError(null);
    try {
      const data = await fetchShowById(showId);
      if (!data) {
        setShow(null);
        setError(t('events.showNotFound'));
        return;
      }
      setShow(data);
    } catch (err) {
      setShow(null);
      setError(err instanceof Error ? err.message : t('events.loadError'));
    } finally {
      setIsShowLoading(false);
    }
  }, [isGoing, showId, t]);

  useEffect(() => {
    void loadShow();
  }, [loadShow]);

  if (isStatusLoading) {
    return null;
  }

  if (!isGoing) {
    return null;
  }

  if (isShowLoading && !show) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (error || !show) {
    return error ? (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.error}>{error}</ThemedText>
      </ThemedView>
    ) : null;
  }

  const venueKind = inferVenueKind(show.venue);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.prepTitle}>{t('prep.sectionTitle')}</ThemedText>
      <ShowCountdown showDate={show.show_date} />
      <VenueInfoCard venue={show.venue} />
      <PrepChecklist enabled showId={showId} />
      <EtiquetteTips venueKind={venueKind} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopColor: '#E2E6EE',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 20,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  prepTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
});
