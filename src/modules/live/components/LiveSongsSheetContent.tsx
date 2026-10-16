import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
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
import { Glass, ListRow, PillButton, SegmentedControl } from '@/core/ui';
import { fetchArtistSongs } from '@/modules/catalog/api';
import { useShow } from '@/modules/events/hooks/useShow';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import type { PredictedSong } from '@/modules/setlist/types';

type SongSegment = 'predicted' | 'others' | 'all';

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
  const params = useLocalSearchParams<{
    artist?: string;
    showId?: string;
    activeTitle?: string;
  }>();

  const artistName = typeof params.artist === 'string' ? params.artist : '';
  const showId = typeof params.showId === 'string' ? params.showId : '';
  const activeTitle = typeof params.activeTitle === 'string' ? params.activeTitle : '';

  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<SongSegment>('predicted');
  const [cachedTitles, setCachedTitles] = useState<Set<string>>(new Set());

  const { prediction } = useShowPrediction(showId, { enabled: Boolean(showId) });
  const { show } = useShow(showId);
  const artistId = show?.artist_id ?? '';

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

  const rows = useMemo(() => {
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
    router.replace({
      pathname: '/live',
      params: {
        artist: artistName,
        showId,
        title,
      },
    });
    router.back();
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 12 }]}>
      <Glass style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('live.songsSheetTitle')}</Text>
          <PillButton
            title={t('live.songsSheetDone')}
            variant="glass"
            onPress={() => router.back()}
          />
        </View>

        <TextInput
          placeholder={t('live.songPickerSearch')}
          placeholderTextColor="#A1A1A6"
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

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {rows.map((row) => (
            <ListRow
              key={row.key}
              leading={
                <Text style={styles.rowIndex}>{row.index}</Text>
              }
              selected={row.active}
              subtitle={row.detail}
              title={row.title}
              trailing={
                cachedTitles.has(row.title) ? (
                  <Ionicons
                    accessibilityLabel={t('live.songHasCachedLyrics')}
                    color={row.active ? '#FFFFFF' : '#A1A1A6'}
                    name="document-text-outline"
                    size={18}
                  />
                ) : null
              }
              onPress={() => selectTitle(row.title)}
            />
          ))}

          {rows.length === 0 && query ? (
            <Pressable onPress={() => selectTitle(search.trim())} style={styles.customRow}>
              <Text style={styles.customText}>
                {t('live.songPickerUseCustom', { title: search.trim() })}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  customRow: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  customText: {
    color: '#FF7A5E',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    height: 5,
    marginBottom: 12,
    width: 36,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  list: {
    gap: 4,
    paddingBottom: 16,
    paddingTop: 8,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
  },
  rowIndex: {
    color: '#A1A1A6',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    width: 22,
  },
  search: {
    backgroundColor: 'rgba(118,118,128,0.28)',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheet: {
    borderRadius: 38,
    flex: 1,
    maxHeight: '92%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
});
