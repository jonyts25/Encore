import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { getArtistById } from '../api';
import { FollowArtistButton } from './FollowArtistButton';
import type { Artist } from '../types';

type ArtistDetailContentProps = {
  artistId: string;
};

export function ArtistDetailContent({ artistId }: ArtistDetailContentProps) {
  const { t } = useTranslation();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getArtistById(artistId);
      if (!data) {
        setError(t('catalog.artistNotFound'));
        setArtist(null);
        return;
      }
      setArtist(data);
    } catch (err) {
      setArtist(null);
      setError(err instanceof Error ? err.message : t('catalog.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [artistId, t]);

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

  if (error || !artist) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error ?? t('catalog.artistNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        {artist.image_url ? (
          <Image source={{ uri: artist.image_url }} style={styles.heroImage} />
        ) : (
          <ThemedView style={styles.heroPlaceholder}>
            <ThemedText style={styles.heroInitial}>{artist.name.charAt(0)}</ThemedText>
          </ThemedView>
        )}

        <ThemedText style={styles.name}>{artist.name}</ThemedText>

        <ThemedText style={styles.sectionLabel}>{t('catalog.genres')}</ThemedText>
        <ThemedText style={styles.genres}>
          {artist.genres?.length ? artist.genres.join(' · ') : t('catalog.noGenres')}
        </ThemedText>

        <FollowArtistButton artistId={artist.id} />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    gap: 12,
    padding: 24,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  genres: {
    fontSize: 16,
    lineHeight: 22,
  },
  heroImage: {
    borderRadius: 16,
    height: 220,
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
    height: 220,
    justifyContent: 'center',
    width: '100%',
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
});
