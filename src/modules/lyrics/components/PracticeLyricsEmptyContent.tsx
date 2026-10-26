import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useIsOffline } from '@/core/network/useIsOffline';
import { queryKeys } from '@/core/query';
import { ListRow, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing } from '@/core/ui/theme/spacing';
import { typography } from '@/core/ui/theme/typography';
import { fetchArtistSongs } from '@/modules/catalog/api';
import type { PracticePackSong } from '@/modules/events/practicePackTypes';
import { practiceSongErrorMessageKey } from '@/modules/events/practiceSongErrors';
import { addPracticeSongToShowPack } from '@/modules/events/showPack';
import type { Show } from '@/modules/events/types';
import { filterSongsByQuery, normalizeSongSearchQuery } from '@/modules/live/liveSongSearchLogic';

import { useLyricsSearchMatches } from '../hooks/useLyricsSearchMatches';

type PracticeLyricsEmptyContentProps = {
  show: Show;
};

type SearchListItem = {
  key: string;
  title: string;
  subtitle: string;
  source: 'catalog' | 'remote';
  songId?: string;
  lyricsArtist?: string;
};

export function PracticeLyricsEmptyContent({ show }: PracticeLyricsEmptyContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const isOffline = useIsOffline();
  const [searchMode, setSearchMode] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const searchQuery = normalizeSongSearchQuery(searchRaw);
  const artistName = show.artist.name;

  const artistSongsQuery = useQuery({
    queryKey: queryKeys.artistSongs(show.artist_id),
    queryFn: () => fetchArtistSongs(show.artist_id),
  });

  const practiceSongsQuery = useQuery({
    queryKey: [...queryKeys.show(show.id), 'practiceSongs'] as const,
    queryFn: async () => {
      const record = await getShowPackRecord(show.id);
      return record?.practiceSongs ?? [];
    },
  });

  const catalogSongs = artistSongsQuery.data ?? [];
  const practiceSongs = practiceSongsQuery.data ?? [];

  const suggestionSongs = useMemo(() => {
    const practiced = new Set(practiceSongs.map((song) => song.title));
    return catalogSongs.filter((song) => !practiced.has(song.title)).slice(0, 12);
  }, [catalogSongs, practiceSongs]);

  const catalogSearchResults = useMemo(() => {
    if (!searchMode) return [];
    return filterSongsByQuery(catalogSongs, searchQuery).slice(0, 30);
  }, [catalogSongs, searchMode, searchQuery]);

  const { matches: remoteMatches, isSearching: isRemoteSearching } = useLyricsSearchMatches({
    artistName,
    searchRaw,
    catalogMatchCount: catalogSearchResults.length,
    isOffline,
  });

  const searchResults = useMemo((): SearchListItem[] => {
    if (!searchMode) return [];
    if (catalogSearchResults.length > 0) {
      return catalogSearchResults.map((song) => ({
        key: `cat-${song.id}`,
        title: song.title,
        subtitle: artistName,
        source: 'catalog' as const,
        songId: song.id,
      }));
    }
    return remoteMatches.map((match) => ({
      key: `remote-${match.id}`,
      title: match.title,
      subtitle: match.artist,
      source: 'remote' as const,
      lyricsArtist: match.artist,
    }));
  }, [artistName, catalogSearchResults, remoteMatches, searchMode]);

  const openLyricsForTitle = useCallback(
    (title: string) => {
      router.replace({
        pathname: '/lyrics',
        params: { artist: artistName, title, showId: show.id },
      });
    },
    [artistName, router, show.id]
  );

  const handlePick = useCallback(
    async (item: SearchListItem) => {
      const trimmed = item.title.trim();
      if (!trimmed || isAdding) return;
      if (item.source === 'remote' && isOffline) {
        setAddError(t('practice.errors.lyricsNetwork'));
        return;
      }

      hapticSelection();
      setIsAdding(true);
      setAddError(null);
      try {
        const result = await addPracticeSongToShowPack(show, {
          title: trimmed,
          songId: item.songId,
          lyricsArtist: item.lyricsArtist,
          requireCatalogSong: item.source === 'remote',
        });
        if (!result.ok) {
          setAddError(
            t(practiceSongErrorMessageKey(result.code), {
              limit: result.limit ?? 30,
            })
          );
          return;
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.artistSongs(show.artist_id) });
        await practiceSongsQuery.refetch();
        openLyricsForTitle(result.title);
      } catch {
        setAddError(t('practice.errors.unknown'));
      } finally {
        setIsAdding(false);
      }
    },
    [isAdding, isOffline, openLyricsForTitle, practiceSongsQuery, queryClient, show, t]
  );

  const handlePickCatalogTitle = useCallback(
    (title: string, songId: string) => {
      void handlePick({
        key: `quick-${songId}`,
        title,
        subtitle: artistName,
        source: 'catalog',
        songId,
      });
    },
    [artistName, handlePick]
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
          onPress={() => {
            setSearchMode(true);
            setAddError(null);
          }}
        />
      </View>

      {addError ? (
        <Text style={[typography.footnote, { color: tokens.recording, marginTop: spacing.sm }]}>
          {addError}
        </Text>
      ) : null}

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
            onChangeText={(value) => {
              setSearchRaw(value);
              setAddError(null);
            }}
          />
          {artistSongsQuery.isLoading || isRemoteSearching ? (
            <ActivityIndicator color={tokens.accent} style={styles.loader} />
          ) : null}
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ListRow
                subtitle={item.subtitle}
                title={item.title}
                onPress={() => void handlePick(item)}
              />
            )}
            ListEmptyComponent={
              searchQuery && !artistSongsQuery.isLoading && !isRemoteSearching ? (
                <Text style={[typography.footnote, { color: tokens.textSecondary, padding: spacing.md }]}>
                  {t('practice.searchEmpty')}
                </Text>
              ) : null
            }
          />
        </View>
      ) : null}

      {practiceSongs.length > 0 ? (
        <View style={styles.section}>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>
            {t('practice.yourSongs')}
          </Text>
          {practiceSongs.map((song: PracticePackSong) => (
            <Pressable key={song.songId || song.title} onPress={() => openLyricsForTitle(song.title)}>
              <ListRow subtitle={artistName} title={song.title} />
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
            <Pressable key={song.id} onPress={() => handlePickCatalogTitle(song.title, song.id)}>
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
