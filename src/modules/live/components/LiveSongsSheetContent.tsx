import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
  title: string;
  index: number;
  detail: string;
  active: boolean;
};

const SHEET_BACKGROUND = 'rgba(28,28,30,0.92)';
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

  const [search, setSearch] = useState('');
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

  const query = normalizeSearch(search);

  const rows = useMemo((): SongRow[] => {
    if (segment === 'predicted') {
      return predictedSongs
        .filter((song) => matchesSearch(song.title, query))
        .map((song, index) => ({
          key: `pred-${song.song_id}`,
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
    }
    if (segment === 'others') {
      return otherSongs
        .filter((song) => matchesSearch(song.title, query))
        .map((song, index) => ({
          key: `other-${song.song_id}`,
          title: song.title,
          index: index + 1,
          detail: t('live.songPickerOthers'),
          active: song.title === activeTitle,
        }));
    }
    return repertoireSongs
      .filter((song) => matchesSearch(song.title, query))
      .map((song, index) => ({
        key: `rep-${song.id}`,
        title: song.title,
        index: index + 1,
        detail: t('live.songPickerRepertoire'),
        active: song.title === activeTitle,
      }));
  }, [
    activeTitle,
    otherSongs,
    predictedSongs,
    query,
    repertoireSongs,
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

  const selectTitle = (title: string) => {
    hapticSelection();
    setActiveTitle(title);
    router.back();
  };

  const listFooter =
    rows.length === 0 && query ? (
      <Pressable onPress={() => selectTitle(search.trim())} style={styles.customRow}>
        <Text style={[typography.bodySemibold, { color: tokens.accentText }]}>
          {t('live.songPickerUseCustom', { title: search.trim() })}
        </Text>
      </Pressable>
    ) : null;

  return (
    <View style={[styles.root, { backgroundColor: SHEET_BACKGROUND, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.title, { color: tokens.text }]}>{t('live.songsSheetTitle')}</Text>
        <PillButton title={t('live.songsSheetDone')} variant="glass" onPress={() => router.back()} />
      </View>

      <TextInput
        placeholder={t('live.songPickerSearch')}
        placeholderTextColor={tokens.textSecondary}
        style={styles.search}
        value={search}
        onChangeText={setSearch}
      />

      <SegmentedControl
        options={[
          { value: 'predicted' as const, label: t('live.songsSegmentPredicted') },
          { value: 'others' as const, label: t('live.songsSegmentOthers') },
          { value: 'all' as const, label: t('live.songsSegmentAll') },
        ]}
        value={segment}
        onChange={setSegment}
      />

      <FlatList
        data={rows}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.key}
        ListFooterComponent={listFooter}
        renderItem={({ item }) => (
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
        )}
        style={styles.list}
      />
    </View>
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
  list: {
    flex: 1,
    marginTop: spacing.md,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
