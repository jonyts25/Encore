import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getShowPackRecord } from '@/core/db/showPackCache';
import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { queryKeys } from '@/core/query';
import { ListRow, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing } from '@/core/ui/theme/spacing';
import { typography } from '@/core/ui/theme/typography';
import { fetchArtistSongs } from '@/modules/catalog/api';
import { addPracticeSongToShowPack } from '@/modules/events/showPack';
import type { Show } from '@/modules/events/types';
import { filterSongsByQuery, normalizeSongSearchQuery } from '@/modules/live/liveSongSearchLogic';

type PracticeLyricsEmptyContentProps = {
  show: Show;
};

export function PracticeLyricsEmptyContent({ show }: PracticeLyricsEmptyContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const [searchMode, setSearchMode] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const searchQuery = normalizeSongSearchQuery(searchRaw);
  const artistName = show.artist.name;

  const artistSongsQuery = useQuery({
    queryKey: queryKeys.artistSongs(show.artist_id),
    queryFn: () => fetchArtistSongs(show.artist_id),
  });

  const practiceTitlesQuery = useQuery({
    queryKey: [...queryKeys.show(show.id), 'practiceTitles'] as const,
    queryFn: async () => {
      const record = await getShowPackRecord(show.id);
      return record?.practiceTitles ?? [];
    },
  });

  const catalogSongs = artistSongsQuery.data ?? [];
  const practiceTitles = practiceTitlesQuery.data ?? [];

  const suggestionSongs = useMemo(() => {
    const practiced = new Set(practiceTitles);
    return catalogSongs.filter((song) => !practiced.has(song.title)).slice(0, 12);
  }, [catalogSongs, practiceTitles]);

  const searchResults = useMemo(() => {
    if (!searchMode) return [];
    return filterSongsByQuery(catalogSongs, searchQuery).slice(0, 30);
  }, [catalogSongs, searchMode, searchQuery]);

  const openLyricsForTitle = useCallback(
    (title: string) => {
      router.replace({
        pathname: '/lyrics',
        params: { artist: artistName, title, showId: show.id },
      });
    },
    [artistName, router, show.id]
  );

  const handlePickTitle = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed || isAdding) return;
      hapticSelection();
      setIsAdding(true);
      try {
        await addPracticeSongToShowPack(show, trimmed);
        await practiceTitlesQuery.refetch();
        openLyricsForTitle(trimmed);
      } finally {
        setIsAdding(false);
      }
    },
    [isAdding, openLyricsForTitle, practiceTitlesQuery, show]
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: tokens.text }]}>{t('practice.emptyTitle')}</Text>
        <Text style={[typography.body, { color: tokens.textSecondary, marginTop: spacing.sm }]}>
          {t('practice.emptySubtitle')}
        </Text>
        <PillButton
          style={styles.searchButton}
          title={t('practice.searchSong')}
          onPress={() => setSearchMode(true)}
        />
      </View>

      {searchMode ? (
        <View style={styles.searchBlock}>
          <TextInput
            autoFocus
            placeholder={t('practice.searchPlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={[
              styles.searchInput,
              { color: tokens.text, borderColor: tokens.separator, backgroundColor: tokens.surface },
            ]}
            value={searchRaw}
            onChangeText={setSearchRaw}
          />
          {artistSongsQuery.isLoading ? (
            <ActivityIndicator color={tokens.accent} style={styles.loader} />
          ) : null}
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ListRow
                subtitle={artistName}
                title={item.title}
                onPress={() => void handlePickTitle(item.title)}
              />
            )}
            ListEmptyComponent={
              searchQuery && !artistSongsQuery.isLoading ? (
                <Text style={[typography.footnote, { color: tokens.textSecondary, padding: spacing.md }]}>
                  {t('practice.searchEmpty')}
                </Text>
              ) : null
            }
          />
        </View>
      ) : null}

      {practiceTitles.length > 0 ? (
        <View style={styles.section}>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>
            {t('practice.yourSongs')}
          </Text>
          {practiceTitles.map((title) => (
            <Pressable key={title} onPress={() => openLyricsForTitle(title)}>
              <ListRow subtitle={artistName} title={title} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {!searchMode && suggestionSongs.length > 0 ? (
        <View style={styles.section}>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>
            {t('practice.suggestions')}
          </Text>
          {suggestionSongs.map((song) => (
            <Pressable key={song.id} onPress={() => void handlePickTitle(song.title)}>
              <ListRow subtitle={t('practice.tapToAdd')} title={song.title} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {isAdding ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color={tokens.accent} size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  busyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: spacing.md,
  },
  loader: {
    marginVertical: spacing.md,
  },
  searchBlock: {
    flex: 1,
    marginTop: spacing.lg,
  },
  searchButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  section: {
    gap: 4,
    marginTop: spacing.xl,
  },
});
