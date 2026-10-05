import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import {
  fetchShowById,
  formatShowDate,
  formatShowVenueLine,
  useShowStatus,
  type Show,
  type ShowStatus,
} from '@/modules/events';

import { EtiquetteTips } from './EtiquetteTips';
import { PrepChecklist } from './PrepChecklist';
import { ShowCountdown } from './ShowCountdown';
import { VenueInfoCard } from './VenueInfoCard';
import { inferVenueKind } from '../utils/venue-kind';

type ShowDetailWithPrepProps = {
  showId: string;
};

export function ShowDetailWithPrep({ showId }: ShowDetailWithPrepProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const {
    status,
    isLoading: isStatusLoading,
    isMutating,
    requiresAuth,
    updateStatus,
    error: statusError,
  } = useShowStatus(showId);
  const [show, setShow] = useState<Show | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchShowById(showId);
      if (!data) {
        setError(t('events.showNotFound'));
        setShow(null);
        return;
      }
      setShow(data);
    } catch (err) {
      setShow(null);
      setError(err instanceof Error ? err.message : t('events.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [showId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (error || !show) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error ?? t('events.showNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  const isGoing = !isStatusLoading && status === 'voy';
  const venueKind = inferVenueKind(show.venue);

  const handleStatusPress = (nextStatus: ShowStatus) => {
    if (requiresAuth) {
      router.push('/(tabs)/profile');
      return;
    }

    void (async () => {
      try {
        await updateStatus(nextStatus);
      } catch {
        // Error rendered below.
      }
    })();
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        {show.artist.image_url ? (
          <Image source={{ uri: show.artist.image_url }} style={styles.heroImage} />
        ) : (
          <ThemedView style={styles.heroPlaceholder}>
            <ThemedText style={styles.heroInitial}>{show.artist.name.charAt(0)}</ThemedText>
          </ThemedView>
        )}

        <ThemedText style={styles.artist}>{show.artist.name}</ThemedText>
        <ThemedText style={styles.venue}>{formatShowVenueLine(show.venue)}</ThemedText>
        <ThemedText style={styles.date}>{formatShowDate(show.show_date, i18n.language)}</ThemedText>

        {show.artist.genres?.length ? (
          <>
            <ThemedText style={styles.sectionLabel}>{t('events.genres')}</ThemedText>
            <ThemedText style={styles.genres}>{show.artist.genres.join(' · ')}</ThemedText>
          </>
        ) : null}

        <ThemedText style={styles.sectionLabel}>{t('events.yourStatus')}</ThemedText>
        <ThemedView style={styles.statusBlock}>
          {requiresAuth ? (
            <ThemedText style={styles.authHint}>{t('events.statusRequiresAuth')}</ThemedText>
          ) : null}

          {!requiresAuth && status ? (
            <ThemedText style={styles.currentStatus}>
              {t('events.currentStatus', { status: t(`events.status.${status}`) })}
            </ThemedText>
          ) : null}

          <ThemedView style={styles.buttonRow}>
            <Button
              disabled={isStatusLoading || isMutating}
              title={
                isStatusLoading || isMutating ? t('common.loading') : t('events.status.interesado')
              }
              variant={status === 'interesado' ? 'primary' : 'secondary'}
              onPress={() => handleStatusPress('interesado')}
            />
            <Button
              disabled={isStatusLoading || isMutating}
              title={isStatusLoading || isMutating ? t('common.loading') : t('events.status.voy')}
              variant={status === 'voy' ? 'primary' : 'secondary'}
              onPress={() => handleStatusPress('voy')}
            />
          </ThemedView>

          {statusError ? <ThemedText style={styles.error}>{statusError}</ThemedText> : null}
        </ThemedView>

        {isGoing ? (
          <ThemedView style={styles.prepBlock}>
            <ThemedText style={styles.prepTitle}>{t('prep.sectionTitle')}</ThemedText>
            <ShowCountdown showDate={show.show_date} />
            <VenueInfoCard venue={show.venue} />
            <PrepChecklist enabled showId={showId} />
            <EtiquetteTips venueKind={venueKind} />
          </ThemedView>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  artist: {
    fontSize: 32,
    fontWeight: '700',
  },
  authHint: {
    fontSize: 13,
    opacity: 0.75,
    textAlign: 'center',
  },
  buttonRow: {
    gap: 10,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    gap: 8,
    padding: 24,
  },
  currentStatus: {
    color: '#2E9B4F',
    fontWeight: '600',
    textAlign: 'center',
  },
  date: {
    fontSize: 16,
    marginBottom: 8,
    opacity: 0.9,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  genres: {
    fontSize: 16,
    marginBottom: 8,
  },
  heroImage: {
    borderRadius: 16,
    height: 200,
    marginBottom: 8,
    width: '100%',
  },
  heroInitial: {
    fontSize: 64,
    fontWeight: '700',
  },
  heroPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8EEF8',
    borderRadius: 16,
    height: 200,
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  prepBlock: {
    borderTopColor: '#E2E6EE',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 20,
    marginTop: 16,
    paddingTop: 20,
  },
  prepTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  statusBlock: {
    gap: 10,
    marginTop: 8,
  },
  venue: {
    fontSize: 18,
    opacity: 0.8,
  },
});
