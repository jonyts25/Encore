import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { listPublicArtists } from '../api';
import type { Artist } from '../types';

export function PublicCatalogList() {
  const { t } = useTranslation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPublicArtists();
      setArtists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('catalog.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (artists.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.title}>{t('catalog.emptyTitle')}</ThemedText>
        <ThemedText style={styles.subtitle}>{t('catalog.emptySubtitle')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={artists}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ThemedView style={styles.row}>
          <ThemedText style={styles.artistName}>{item.name}</ThemedText>
          {item.genres?.length ? (
            <ThemedText style={styles.genres}>{item.genres.join(' · ')}</ThemedText>
          ) : null}
        </ThemedView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  artistName: {
    fontSize: 17,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  genres: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  list: {
    padding: 16,
  },
  row: {
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
