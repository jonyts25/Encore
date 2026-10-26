import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasCachedLyrics } from '@/core/db/lyricsCache';
import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { queryKeys } from '@/core/query';
import { ListRow, PillButton, SegmentedControl } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';
import { spacing } from '@/core/ui/theme/spacing';
import { typography } from '@/core/ui/theme/typography';
import { fetchArtistSongs } from '@/modules/catalog/api';
import { useShow } from '@/modules/events/hooks/useShow';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import type { PredictedSong } from '@/modules/setlist/types';

import { useLiveSession } from '../context/LiveSessionContext';

type SongSegment = 'predicted' | 'others' | 'all';

type SongRow = {
  key: string;
  kind: 'song' | 'header';
  title: string;
  index: number;
  detail: string;
  active: boolean;
};

const LIST_HEADER_BACKGROUND = 'rgba(28,28,30,0.98)';
const tokens = darkTokens;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(title: string, query: string): boolean {
  if (!query) return true;
  return title.toLowerCase().includes(query);
}

function sortPredicted(songs: PredictedSong[]) {
  return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

type LiveSongsSheetListHeaderProps = {
  segment: SongSegment;
  onSegmentChange: (segment: SongSegment) => void;
  onSearchQueryChange: (normalized: string, raw: string) => void;
  onDone: () => void;
};

const LiveSongsSheetListHeader = memo(function LiveSongsSheetListHeader({
  segment,
  onSegmentChange,
  onSearchQueryChange,
  onDone,
}: LiveSongsSheetListHeaderProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onSearchQueryChange(normalizeSearch(value), value);
    },
    [onSearchQueryChange]
  );

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

      <SegmentedControl
        options={[
          { value: 'predicted' as const, label: t('live.songsSegmentPredicted') },
          { value: 'others' as const, label: t('live.songsSegmentOthers') },
          { value: 'all' as const, label: t('live.songsSegmentAll') },
        ]}
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

  const { prediction } = useShowPrediction(showId, { enabled: Boolean(showId) });
  const { show } = useShow(showId);
  const artistId = show?.artist_id ?? '';

  useEffect(() => {
    if (initialTitle.trim()) {
      setActiveTitle(initialTitle);
    }
  }, [initialTitle, setActiveTitle]);

  const artistSongsQuery = useQuery({
    queryKey: queryKeys.artistSongs(artistId),
    queryFn: () => fetchArtistSongs(artistId),
    enabled: Boolean(artistId),
  });

  const predictedSongs = useMemo(
    () => sortPredicted(prediction?.songs ?? []),
    [prediction?.songs]
  );
  const otherSongs = prediction?.others ?? [];
  const repertoireSongs = artistSongsQuery.data ?? [];

  const rows = useMemo((): SongRow[] => {
    if (segment === 'predicted') {
      const predictedRows = predictedSongs
        .filter((song) => matchesSearch(song.title, searchQuery))
        .map((song, index) => ({
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

      const filteredOthers = otherSongs.filter((song) => matchesSearch(song.title, searchQuery));
      if (filteredOthers.length === 0) {
        return predictedRows;
      }

      return [
        ...predictedRows,
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
    if (segment === 'others') {
      return otherSongs
        .filter((song) => matchesSearch(song.title, searchQuery))
        .map((song, index) => ({
          key: `other-${song.song_id}`,
          kind: 'song' as const,
          title: song.title,
          index: index + 1,
          detail: t('live.songPickerOthers'),
          active: song.title === activeTitle,
        }));
    }
    return repertoireSongs
      .filter((song) => matchesSearch(song.title, searchQuery))
      .map((song, index) => ({
        key: `rep-${song.id}`,
        kind: 'song' as const,
        title: song.title,
        index: index + 1,
        detail: t('live.songPickerRepertoire'),
        active: song.title === activeTitle,
      }));
  }, [
    activeTitle,
    otherSongs,
    predictedSongs,
    repertoireSongs,
    searchQuery,
    segment,
    t,
  ]);

  useEffect(() => {
    const titles = new Set<string>();
    for (const song of predictedSongs) titles.add(song.title);
    for (const song of otherSongs) titles.add(song.title);
    for (const song of repertoireSongs) titles.add(song.title);

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
  }, [artistName, otherSongs, predictedSongs, repertoireSongs]);

  const selectTitle = useCallback(
    (title: string) => {
      hapticSelection();
      setActiveTitle(title);
      router.back();
    },
    [router, setActiveTitle]
  );

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  const listHeader = useMemo(
    () => (
      <LiveSongsSheetListHeader
        segment={segment}
        onDone={handleDone}
        onSearchQueryChange={(normalized, raw) => {
          setSearchQuery(normalized);
          setSearchRaw(raw);
        }}
        onSegmentChange={setSegment}
      />
    ),
    [handleDone, segment]
  );

  const listFooter =
    rows.length === 0 && searchQuery ? (
      <Pressable
        onPress={() => selectTitle(searchRaw.trim())}
        style={styles.customRow}>
        <Text style={[typography.bodySemibold, { color: tokens.accentText }]}>
          {t('live.songPickerUseCustom', { title: searchRaw.trim() })}
        </Text>
      </Pressable>
    ) : null;

  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
      contentInsetAdjustmentBehavior="never"
      data={rows}
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
            onPress={() => selectTitle(item.title)}
          />
        )
      }
      stickyHeaderIndices={[0]}
      style={styles.listRoot}
    />
  );
}

const styles = StyleSheet.create({
  customRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
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
