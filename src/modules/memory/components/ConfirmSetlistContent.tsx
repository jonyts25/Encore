import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { useIsOffline } from '@/core/network/useIsOffline';
import { queryKeys } from '@/core/query';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { addUserSong, fetchArtistSongs } from '@/modules/catalog/api';
import { useShow } from '@/modules/events/hooks/useShow';
import { useShowStatus } from '@/modules/events/hooks/useShowStatus';
import { filterSongsByQuery, normalizeSongSearchQuery } from '@/modules/live/liveSongSearchLogic';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import { sortPredictedSongsForDisplay } from '@/modules/setlist/predictionDisplay';
import { useLyricsSearchMatches } from '@/modules/lyrics/hooks/useLyricsSearchMatches';
import { useSession } from '@/modules/identity';

import { fetchShowSongsForPrefill, persistShowMemory } from '../memoryApi';
import { computePredictionAccuracy } from '../predictionAccuracyLogic';
import {
  draftToMemorySongs,
  moveSetlistItem,
  resolveSetlistPrefill,
  toggleHighlight,
} from '../setlistPrefillLogic';
import type { SetlistDraftItem } from '../types';
import { useShowMemory } from '../hooks/useShowMemory';

type ConfirmSetlistContentProps = {
  showId: string;
};

type SearchItem = {
  key: string;
  title: string;
  songId?: string;
  lyricsArtist?: string;
  source: 'catalog' | 'remote';
};

export function ConfirmSetlistContent({ showId }: ConfirmSetlistContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const isOffline = useIsOffline();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { show, isLoading: showLoading } = useShow(showId);
  const { status: userShowStatus } = useShowStatus(showId);
  const { prediction } = useShowPrediction(showId);
  const { memory, refresh: refreshMemory } = useShowMemory(showId, Boolean(userId));

  const [items, setItems] = useState<SetlistDraftItem[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [encoreStartIndex, setEncoreStartIndex] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [addingSong, setAddingSong] = useState(false);

  const prefillQuery = useQuery({
    queryKey: ['setlistPrefill', showId],
    queryFn: () => fetchShowSongsForPrefill(showId),
    enabled: Boolean(showId),
  });

  const predictedSongs = useMemo(() => {
    if (!prediction?.songs.length) return [];
    return sortPredictedSongsForDisplay(prediction);
  }, [prediction]);

  useEffect(() => {
    if (initialized || prefillQuery.isPending) return;

    if (memory?.setlist_confirmed_at && memory.songs.length > 0) {
      setItems(
        memory.songs.map((song, index) => ({
          key: `saved-${song.song_id}-${index}`,
          songId: song.song_id,
          title: song.title,
          played: true,
          isHighlight: song.is_highlight,
        }))
      );
      setRating(memory.rating);
      setNote(memory.note ?? '');
      const encoreIndex = memory.songs.findIndex((song) => song.is_encore);
      setEncoreStartIndex(encoreIndex >= 0 ? encoreIndex : null);
      setInitialized(true);
      return;
    }

    const draft = resolveSetlistPrefill(prefillQuery.data ?? [], predictedSongs);
    setItems(draft);
    const encoreIdx = (prefillQuery.data ?? []).findIndex((row) => row.is_encore);
    setEncoreStartIndex(encoreIdx >= 0 ? encoreIdx : null);
    setInitialized(true);
  }, [initialized, memory, predictedSongs, prefillQuery.data, prefillQuery.isPending]);

  const artistId = show?.artist_id ?? '';
  const artistName = show?.artist.name ?? '';

  const artistSongsQuery = useQuery({
    queryKey: queryKeys.artistSongs(artistId),
    queryFn: () => fetchArtistSongs(artistId),
    enabled: Boolean(artistId) && searchOpen,
  });

  const searchQuery = normalizeSongSearchQuery(searchRaw);
  const catalogResults = useMemo(() => {
    if (!searchOpen) return [];
    return filterSongsByQuery(artistSongsQuery.data ?? [], searchQuery).slice(0, 30);
  }, [artistSongsQuery.data, searchOpen, searchQuery]);

  const { matches: remoteMatches, isSearching: isRemoteSearching } = useLyricsSearchMatches({
    artistName,
    searchRaw,
    catalogMatchCount: catalogResults.length,
    isOffline,
  });

  const searchResults = useMemo((): SearchItem[] => {
    if (!searchOpen) return [];
    if (catalogResults.length > 0) {
      return catalogResults.map((song) => ({
        key: `cat-${song.id}`,
        title: song.title,
        songId: song.id,
        source: 'catalog' as const,
      }));
    }
    return remoteMatches.map((match) => ({
      key: `remote-${match.id}`,
      title: match.title,
      songId: undefined,
      lyricsArtist: match.artist,
      source: 'remote' as const,
    }));
  }, [catalogResults, remoteMatches, searchOpen]);

  const addSongToList = useCallback(
    async (item: SearchItem) => {
      if (!artistId || addingSong) return;
      setAddingSong(true);
      try {
        let songId = item.songId;
        if (!songId) {
          const result = await addUserSong(artistId, item.title);
          if (!result.ok || !result.song) {
            Alert.alert(t('memory.setlist.addSongError'));
            return;
          }
          songId = result.song.id;
        }
        setItems((prev) => {
          if (prev.some((row) => row.songId === songId)) return prev;
          return [
            ...prev,
            {
              key: `added-${songId}-${Date.now()}`,
              songId,
              title: item.title,
              played: true,
              isHighlight: false,
            },
          ];
        });
        setSearchOpen(false);
        setSearchRaw('');
      } finally {
        setAddingSong(false);
      }
    },
    [addingSong, artistId, t]
  );

  const onSave = async () => {
    if (!userId || !show) return;
    setSaving(true);
    try {
      const songs = draftToMemorySongs(items, encoreStartIndex);
      const confirmedAt = new Date().toISOString();
      await persistShowMemory(userId, {
        show_id: show.id,
        rating,
        note: note.trim() || null,
        setlist_confirmed_at: confirmedAt,
        songs,
      });
      await refreshMemory();

      const predictedIds = predictedSongs.map((song) => song.song_id);
      const confirmedIds = songs.map((song) => song.song_id);
      const accuracy = computePredictionAccuracy(predictedIds, confirmedIds);

      if (predictedIds.length > 0) {
        Alert.alert(
          t('memory.setlist.savedTitle'),
          t('memory.setlist.predictionScore', {
            hits: accuracy.hits,
            total: accuracy.total,
          }),
          [{ text: t('common.close'), onPress: () => router.back() }]
        );
      } else {
        Alert.alert(t('memory.setlist.savedTitle'), t('memory.setlist.savedBody'), [
          { text: t('common.close'), onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert(t('memory.setlist.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (showLoading && !show) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (!show) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={{ color: tokens.textSecondary }}>{t('events.showNotFound')}</Text>
      </View>
    );
  }

  if (userShowStatus !== 'fui') {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={{ color: tokens.textSecondary }}>{t('memory.setlist.requiresAttended')}</Text>
        <PillButton title={t('common.close')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{
        padding: spacing.screenHorizontal,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.md,
      }}
      keyboardShouldPersistTaps="handled">
      <Text style={[typography.body, { color: tokens.textSecondary }]}>
        {t('memory.setlist.subtitle', { artist: show.artist.name })}
      </Text>

      <View style={styles.section}>
        <Text style={[typography.title, { color: tokens.text }]}>{t('memory.setlist.ratingTitle')}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityLabel={t('memory.setlist.star', { value })}
              onPress={() => {
                hapticSelection();
                setRating(value);
              }}>
              <Ionicons
                color={rating != null && value <= rating ? tokens.accent : tokens.textSecondary}
                name={rating != null && value <= rating ? 'star' : 'star-outline'}
                size={32}
              />
            </Pressable>
          ))}
        </View>
        <TextInput
          multiline
          placeholder={t('memory.setlist.notePlaceholder')}
          placeholderTextColor={tokens.textSecondary}
          style={[
            styles.noteInput,
            { color: tokens.text, borderColor: tokens.separator, backgroundColor: tokens.surface },
          ]}
          value={note}
          onChangeText={setNote}
        />
      </View>

      <View style={styles.section}>
        <Text style={[typography.title, { color: tokens.text }]}>{t('memory.setlist.songsTitle')}</Text>
        {items.length === 0 ? (
          <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
            {t('memory.setlist.empty')}
          </Text>
        ) : null}
        {items.map((item, index) => (
          <View
            key={item.key}
            style={[styles.songRow, { borderColor: tokens.separator, backgroundColor: tokens.surface }]}>
            <Pressable
              accessibilityLabel={t('memory.setlist.togglePlayed')}
              onPress={() =>
                setItems((prev) =>
                  prev.map((row) => (row.key === item.key ? { ...row, played: !row.played } : row))
                )
              }>
              <Ionicons
                color={item.played ? tokens.accent : tokens.textSecondary}
                name={item.played ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
              />
            </Pressable>
            <View style={styles.songMain}>
              <Text style={[typography.bodySemibold, { color: tokens.text }]}>{item.title}</Text>
              {encoreStartIndex === index ? (
                <Text style={[typography.footnote, { color: tokens.accent }]}>
                  {t('memory.setlist.encoreStartsHere')}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={t('memory.setlist.toggleHighlight')}
              onPress={() => setItems((prev) => toggleHighlight(prev, item.key))}>
              <Ionicons
                color={item.isHighlight ? '#E25555' : tokens.textSecondary}
                name={item.isHighlight ? 'heart' : 'heart-outline'}
                size={22}
              />
            </Pressable>
            <View style={styles.reorder}>
              <Pressable disabled={index === 0} onPress={() => setItems((prev) => moveSetlistItem(prev, item.key, -1))}>
                <Ionicons color={tokens.textSecondary} name="chevron-up" size={20} />
              </Pressable>
              <Pressable
                disabled={index === items.length - 1}
                onPress={() => setItems((prev) => moveSetlistItem(prev, item.key, 1))}>
                <Ionicons color={tokens.textSecondary} name="chevron-down" size={20} />
              </Pressable>
            </View>
            <Pressable
              accessibilityLabel={t('memory.setlist.markEncoreStart')}
              onPress={() => setEncoreStartIndex(index)}>
              <Text style={[typography.footnoteSemibold, { color: tokens.textSecondary }]}>E</Text>
            </Pressable>
          </View>
        ))}
        <PillButton title={t('memory.setlist.addSong')} variant="secondary" onPress={() => setSearchOpen(true)} />
      </View>

      {searchOpen ? (
        <View style={[styles.searchPanel, { borderColor: tokens.separator, backgroundColor: tokens.surface }]}>
          <TextInput
            autoFocus
            placeholder={t('practice.searchPlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={[styles.searchInput, { color: tokens.text, borderColor: tokens.separator }]}
            value={searchRaw}
            onChangeText={setSearchRaw}
          />
          {artistSongsQuery.isLoading || isRemoteSearching ? <ActivityIndicator color={tokens.accent} /> : null}
          {searchResults.map((item) => (
            <Pressable key={item.key} style={styles.searchRow} onPress={() => void addSongToList(item)}>
              <Text style={[typography.body, { color: tokens.text }]}>{item.title}</Text>
            </Pressable>
          ))}
          <PillButton title={t('common.close')} variant="secondary" onPress={() => setSearchOpen(false)} />
        </View>
      ) : null}

      <PillButton
        disabled={saving}
        title={saving ? t('common.loading') : t('memory.setlist.save')}
        variant="primary"
        onPress={() => void onSave()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  noteInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  reorder: {
    alignItems: 'center',
    gap: 2,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchPanel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 12,
  },
  searchRow: {
    paddingVertical: 8,
  },
  section: {
    gap: 10,
  },
  songMain: {
    flex: 1,
    gap: 2,
  },
  songRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
});
