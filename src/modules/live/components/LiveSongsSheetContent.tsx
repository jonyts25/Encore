import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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

import { hasCachedLyrics } from '@/core/db/lyricsCache';
import { getShowPackRecord } from '@/core/db/showPackCache';
import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { useIsOffline } from '@/core/network/useIsOffline';
import { queryKeys } from '@/core/query';
import { ListRow, PillButton, SegmentedControl } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';
import { spacing } from '@/core/ui/theme/spacing';
import { typography } from '@/core/ui/theme/typography';
import { fetchArtistSongs } from '@/modules/catalog/api';
import { practiceSongErrorMessageKey } from '@/modules/events/practiceSongErrors';
import { addPracticeSongToShowPack, cacheLyricsForShowPackTitle } from '@/modules/events/showPack';
import type { PracticePackSong } from '@/modules/events/practicePackTypes';
import { useShow } from '@/modules/events/hooks/useShow';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import type { PredictedSong } from '@/modules/setlist/types';
import { useLyricsSearchMatches } from '@/modules/lyrics/hooks/useLyricsSearchMatches';

import { useLiveSession } from '../context/LiveSessionContext';
import {
  filterSongsByQuery,
  isRepertoireSegmentAvailable,
  normalizeSongSearchQuery,
  pickSearchScope,
} from '../liveSongSearchLogic';

type SongSegment = 'predicted' | 'others' | 'all';

type SongRow = {
  key: string;
  kind: 'song' | 'header';
  title: string;
  index: number;
  detail: string;
  active: boolean;
  songId?: string;
  fromRemote?: boolean;
  lyricsArtist?: string;
};

const LIST_HEADER_BACKGROUND = 'rgba(28,28,30,0.98)';
const tokens = darkTokens;

function sortPredicted(songs: PredictedSong[]) {
  return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

type LiveSongsSheetListHeaderProps = {
  segment: SongSegment;
  onSegmentChange: (segment: SongSegment) => void;
  onSearchQueryChange: (normalized: string, raw: string) => void;
  onDone: () => void;
  isOffline: boolean;
};

const LiveSongsSheetListHeader = memo(function LiveSongsSheetListHeader({
  segment,
  onSegmentChange,
  onSearchQueryChange,
  onDone,
  isOffline,
}: LiveSongsSheetListHeaderProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onSearchQueryChange(normalizeSongSearchQuery(value), value);
    },
    [onSearchQueryChange]
  );

  const segmentOptions = useMemo((): { value: SongSegment; label: string }[] => {
    const options: { value: SongSegment; label: string }[] = [
      { value: 'predicted', label: t('live.songsSegmentPredicted') },
      { value: 'others', label: t('live.songsSegmentOthers') },
    ];
    if (isRepertoireSegmentAvailable(!isOffline)) {
      options.push({ value: 'all', label: t('live.songsSegmentAll') });
    }
    return options;
  }, [isOffline, t]);

  return (
    <View style={styles.listHeader}>
      <View style={styles.headerRow}>
        <Text style={[typography.title, { color: tokens.text }]}>{t('live.songsSheetTitle')}</Text>
        <PillButton title={t('live.songsSheetDone')} variant="glass" onPress={onDone} />
      </View>

      <TextInput
        placeholder={t('live.songPickerSearch')}
        placeholderTextColor={tokens.textSecondary}
        style={styles.search}
        value={search}
        onChangeText={handleSearchChange}
      />

      {isOffline ? (
        <Text style={[typography.footnote, { color: tokens.textSecondary, marginBottom: spacing.sm }]}>
          {t('live.songPickerOfflineHint')}
        </Text>
      ) : null}

      <SegmentedControl
        options={segmentOptions}
        value={segment}
        onChange={onSegmentChange}
      />
    </View>
  );
});

export function LiveSongsSheetContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const queryClient = useQueryClient();
  const { activeTitle, setActiveTitle } = useLiveSession();
  const params = useLocalSearchParams<{
    artist?: string;
    showId?: string;
    activeTitle?: string;
  }>();

  const artistName = typeof params.artist === 'string' ? params.artist : '';
  const showId = typeof params.showId === 'string' ? params.showId : '';
  const initialTitle = typeof params.activeTitle === 'string' ? params.activeTitle : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchRaw, setSearchRaw] = useState('');
  const [segment, setSegment] = useState<SongSegment>('predicted');
  const [cachedTitles, setCachedTitles] = useState<Set<string>>(new Set());
  const [practiceSongs, setPracticeSongs] = useState<PracticePackSong[]>([]);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [addSongError, setAddSongError] = useState<string | null>(null);

  const { prediction } = useShowPrediction(showId, { enabled: Boolean(showId) });
  const { show } = useShow(showId);
  const artistId = show?.artist_id ?? '';

  useEffect(() => {
    if (initialTitle.trim()) {
      setActiveTitle(initialTitle);
    }
  }, [initialTitle, setActiveTitle]);

  useEffect(() => {
    if (!showId) {
      setPracticeSongs([]);
      return;
    }
    void getShowPackRecord(showId).then((record) => {
      setPracticeSongs(record?.practiceSongs ?? []);
    });
  }, [showId]);

  useEffect(() => {
    if (segment === 'all' && isOffline) {
      setSegment('predicted');
    }
  }, [isOffline, segment]);

  const artistSongsQuery = useQuery({
    queryKey: queryKeys.artistSongs(artistId),
    queryFn: () => fetchArtistSongs(artistId),
    enabled: Boolean(artistId) && !isOffline,
  });

  const predictedSongs = useMemo(
    () => sortPredicted(prediction?.songs ?? []),
    [prediction?.songs]
  );
  const otherSongs = prediction?.others ?? [];
  const repertoireSongs = artistSongsQuery.data ?? [];

  const catalogMatchCount = useMemo(
    () => filterSongsByQuery(repertoireSongs, searchQuery).length,
    [repertoireSongs, searchQuery]
  );

  const { matches: remoteMatches, isSearching: isRemoteSearching } = useLyricsSearchMatches({
    artistName,
    searchRaw,
    catalogMatchCount,
    isOffline,
  });

  const effectiveSegment = pickSearchScope({ segment, isOffline });

  const practiceRows = useMemo((): SongRow[] => {
    const predictedTitleSet = new Set(predictedSongs.map((song) => song.title));
    return practiceSongs
      .filter((song) => !predictedTitleSet.has(song.title))
      .filter((song) => filterSongsByQuery([{ title: song.title }], searchQuery).length > 0)
      .map((song, index) => ({
        key: `practice-${song.songId || song.title}`,
        kind: 'song' as const,
        title: song.title,
        songId: song.songId,
        index: index + 1,
        detail: t('live.songsPracticePick'),
        active: song.title === activeTitle,
      }));
  }, [activeTitle, predictedSongs, practiceSongs, searchQuery, t]);

  const rows = useMemo((): SongRow[] => {
    if (effectiveSegment === 'predicted') {
      const predictedRows = filterSongsByQuery(predictedSongs, searchQuery).map((song, index) => ({
        key: `pred-${song.song_id}`,
        kind: 'song' as const,
        title: song.title,
        index: index + 1,
        detail:
          song.title === activeTitle
            ? t('live.songsNowPlaying')
            : t('live.songsConfidence', {
                percent: Math.round((song.confidence ?? 0) * 100),
              }),
        active: song.title === activeTitle,
      }));

      const filteredOthers = filterSongsByQuery(otherSongs, searchQuery);
      const withPractice = [...practiceRows, ...predictedRows];

      if (filteredOthers.length === 0) {
        return withPractice;
      }

      return [
        ...withPractice,
        {
          key: 'others-header',
          kind: 'header' as const,
          title: t('live.songsSegmentOthers'),
          index: 0,
          detail: '',
          active: false,
        },
        ...filteredOthers.map((song, index) => ({
          key: `other-inline-${song.song_id}`,
          kind: 'song' as const,
          title: song.title,
          index: index + 1,
          detail: t('live.songPickerOthers'),
          active: song.title === activeTitle,
        })),
      ];
    }
    if (effectiveSegment === 'others') {
      return filterSongsByQuery(otherSongs, searchQuery).map((song, index) => ({
        key: `other-${song.song_id}`,
        kind: 'song' as const,
        title: song.title,
        index: index + 1,
        detail: t('live.songPickerOthers'),
        active: song.title === activeTitle,
      }));
    }
    return filterSongsByQuery(repertoireSongs, searchQuery).map((song, index) => ({
      key: `rep-${song.id}`,
      kind: 'song' as const,
      title: song.title,
      index: index + 1,
      detail: t('live.songPickerRepertoire'),
      active: song.title === activeTitle,
    }));
  }, [
    activeTitle,
    effectiveSegment,
    otherSongs,
    practiceRows,
    predictedSongs,
    repertoireSongs,
    searchQuery,
    t,
  ]);

  const remoteRows = useMemo((): SongRow[] => {
    if (!searchQuery || catalogMatchCount > 0) return [];
    const existingTitles = new Set(
      rows.filter((row) => row.kind === 'song').map((row) => row.title.trim().toLowerCase())
    );
    return remoteMatches
      .filter((match) => !existingTitles.has(match.title.trim().toLowerCase()))
      .map((match, index) => ({
        key: `remote-${match.id}`,
        kind: 'song' as const,
        title: match.title,
        songId: undefined,
        fromRemote: true,
        lyricsArtist: match.artist,
        index: index + 1,
        detail: match.artist,
        active: match.title === activeTitle,
      }));
  }, [activeTitle, catalogMatchCount, remoteMatches, rows, searchQuery]);

  const displayRows = useMemo(() => {
    if (remoteRows.length === 0) return rows;
    if (rows.length === 0) return remoteRows;
    return [
      ...rows,
      {
        key: 'remote-header',
        kind: 'header' as const,
        title: t('live.songsLyricsSearchHeader'),
        index: 0,
        detail: '',
        active: false,
      },
      ...remoteRows,
    ];
  }, [remoteRows, rows, t]);

  useEffect(() => {
    const titles = new Set<string>();
    for (const song of predictedSongs) titles.add(song.title);
    for (const song of otherSongs) titles.add(song.title);
    for (const song of repertoireSongs) titles.add(song.title);
    for (const song of practiceSongs) titles.add(song.title);

    void (async () => {
      const cached = new Set<string>();
      await Promise.all(
        [...titles].map(async (title) => {
          if (await hasCachedLyrics(artistName, title)) {
            cached.add(title);
          }
        })
      );
      setCachedTitles(cached);
    })();
  }, [artistName, otherSongs, practiceSongs, predictedSongs, repertoireSongs]);

  const selectSongRow = useCallback(
    async (row: SongRow) => {
      if (row.kind !== 'song') return;
      hapticSelection();
      setAddSongError(null);
      const trimmed = row.title.trim();
      if (!trimmed || !show) return;

      if (row.fromRemote) {
        if (isOffline) {
          setAddSongError(t('practice.errors.lyricsNetwork'));
          return;
        }
        setIsFetchingLyrics(true);
        try {
          const result = await addPracticeSongToShowPack(show, {
            title: trimmed,
            lyricsArtist: row.lyricsArtist,
            requireCatalogSong: true,
          });
          if (!result.ok) {
            setAddSongError(
              t(practiceSongErrorMessageKey(result.code), {
                limit: result.limit ?? 30,
              })
            );
            return;
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.artistSongs(show.artist_id) });
          const record = await getShowPackRecord(show.id);
          setPracticeSongs(record?.practiceSongs ?? []);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.lyrics(artistName, result.title),
          });
          setCachedTitles((current) => new Set([...current, result.title]));
          setActiveTitle(result.title);
          router.back();
        } finally {
          setIsFetchingLyrics(false);
        }
        return;
      }

      if (!isOffline && !(await hasCachedLyrics(artistName, trimmed))) {
        setIsFetchingLyrics(true);
        try {
          await cacheLyricsForShowPackTitle(show, trimmed);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.lyrics(artistName, trimmed),
          });
          setCachedTitles((current) => new Set([...current, trimmed]));
        } finally {
          setIsFetchingLyrics(false);
        }
      }

      setActiveTitle(trimmed);
      router.back();
    },
    [artistName, isOffline, queryClient, router, setActiveTitle, show, t]
  );

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  const listHeader = useMemo(
    () => (
      <LiveSongsSheetListHeader
        isOffline={isOffline}
        segment={segment}
        onDone={handleDone}
        onSearchQueryChange={(normalized, raw) => {
          setSearchQuery(normalized);
          setSearchRaw(raw);
          setAddSongError(null);
        }}
        onSegmentChange={setSegment}
      />
    ),
    [handleDone, isOffline, segment]
  );

  const listFooter =
    searchQuery && displayRows.length === 0 ? (
      isRemoteSearching ? (
        <ActivityIndicator color={tokens.accentText} style={styles.emptySearch} />
      ) : (
        <Text style={[typography.secondary, styles.emptySearch, { color: tokens.textSecondary }]}>
          {t('live.songPickerNoMatches')}
        </Text>
      )
    ) : null;

  return (
    <>
      {addSongError ? (
        <View style={styles.errorBanner}>
          <Text style={[typography.footnote, { color: tokens.recording }]}>{addSongError}</Text>
        </View>
      ) : null}
      {isFetchingLyrics ? (
        <View style={styles.fetchingOverlay}>
          <ActivityIndicator color={tokens.accentText} />
          <Text style={{ color: tokens.textSecondary }}>{t('live.songPickerDownloadingLyrics')}</Text>
        </View>
      ) : null}
      <FlatList
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        contentInsetAdjustmentBehavior="never"
        data={displayRows}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.key}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={[typography.footnoteSemibold, styles.sectionHeader, { color: tokens.textSecondary }]}>
              {item.title}
            </Text>
          ) : (
            <ListRow
              leading={<Text style={styles.rowIndex}>{item.index}</Text>}
              selected={false}
              style={item.active ? styles.rowActive : undefined}
              subtitle={item.detail}
              subtitleColor={item.active ? tokens.accentText : undefined}
              title={item.title}
              trailing={
                cachedTitles.has(item.title) ? (
                  <Ionicons
                    accessibilityLabel={t('live.songHasCachedLyrics')}
                    color={item.active ? tokens.text : tokens.textSecondary}
                    name="document-text-outline"
                    size={18}
                  />
                ) : null
              }
              onPress={() => void selectSongRow(item)}
            />
          )
        }
        stickyHeaderIndices={[0]}
        style={styles.listRoot}
      />
    </>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  customRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptySearch: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fetchingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    bottom: 0,
    gap: 8,
    justifyContent: 'center',
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  listHeader: {
    backgroundColor: LIST_HEADER_BACKGROUND,
    paddingBottom: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listRoot: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  rowActive: {
    backgroundColor: `${tokens.accent}47`,
  },
  rowIndex: {
    color: tokens.textSecondary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    width: 22,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  search: {
    backgroundColor: 'rgba(118,118,128,0.28)',
    borderRadius: 12,
    color: tokens.text,
    fontSize: 16,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
});
