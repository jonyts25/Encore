import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
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
import {
  buildRowsFromDraft,
  snapshotFromDraft,
  snapshotsEqual,
  rowsToDraft,
  type SetlistListRow,
} from '../setlistRowLogic';
import {
  draftToMemorySongs,
  resolveSetlistPrefill,
  toggleHighlight,
} from '../setlistPrefillLogic';
import { useShowMemory } from '../hooks/useShowMemory';

import { SetlistDraggableList } from './SetlistDraggableList';

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

  const [rows, setRows] = useState<SetlistListRow[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [addingSong, setAddingSong] = useState(false);

  const listRef = useRef<FlatList<SetlistListRow>>(null);

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

    let items = resolveSetlistPrefill(prefillQuery.data ?? [], predictedSongs);
    let encoreStartIndex: number | null = null;
    let initialRating: number | null = null;
    let initialNote = '';

    if (memory?.setlist_confirmed_at && memory.songs.length > 0) {
      items = memory.songs.map((song, index) => ({
        key: `saved-${song.song_id}-${index}`,
        songId: song.song_id,
        title: song.title,
        played: true,
        isHighlight: song.is_highlight,
      }));
      initialRating = memory.rating;
      initialNote = memory.note ?? '';
      const encoreIndex = memory.songs.findIndex((song) => song.is_encore);
      encoreStartIndex = encoreIndex >= 0 ? encoreIndex : null;
    } else {
      const encoreIdx = (prefillQuery.data ?? []).findIndex((row) => row.is_encore);
      encoreStartIndex = encoreIdx >= 0 ? encoreIdx : null;
    }

    const initialRows = buildRowsFromDraft(items, encoreStartIndex);
    setRows(initialRows);
    setRating(initialRating);
    setNote(initialNote);
    setBaselineSnapshot(JSON.stringify(snapshotFromDraft(initialRating, initialNote, initialRows)));
    setInitialized(true);
  }, [initialized, memory, predictedSongs, prefillQuery.data, prefillQuery.isPending]);

  const isDirty = useMemo(() => {
    if (!initialized || baselineSnapshot == null) return false;
    return !snapshotsEqual(JSON.parse(baselineSnapshot), snapshotFromDraft(rating, note, rows));
  }, [baselineSnapshot, initialized, note, rating, rows]);

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

  const insertSongRow = useCallback((songId: string, title: string) => {
    setRows((prev) => {
      const encoreIdx = prev.findIndex((row) => row.kind === 'encore');
      const newRow: SetlistListRow = {
        kind: 'song',
        item: {
          key: `added-${songId}-${Date.now()}`,
          songId,
          title,
          played: true,
          isHighlight: false,
        },
      };
      if (encoreIdx < 0) return [...prev, newRow];
      const next = [...prev];
      next.splice(encoreIdx, 0, newRow);
      return next;
    });
  }, []);

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
        const { items } = rowsToDraft(rows);
        if (items.some((row) => row.songId === songId)) return;
        insertSongRow(songId, item.title);
        setSearchOpen(false);
        setSearchRaw('');
      } finally {
        setAddingSong(false);
      }
    },
    [addingSong, artistId, insertSongRow, rows, t]
  );

  const onTogglePlayed = useCallback((key: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.kind === 'song' && row.item.key === key ? { ...row, item: { ...row.item, played: !row.item.played } } : row
      )
    );
  }, []);

  const onToggleHighlight = useCallback((key: string) => {
    setRows((prev) => {
      const { items } = rowsToDraft(prev);
      const nextItems = toggleHighlight(items, key);
      const itemByKey = new Map(nextItems.map((item) => [item.key, item]));
      return prev.map((row) =>
        row.kind === 'song' ? { ...row, item: itemByKey.get(row.item.key) ?? row.item } : row
      );
    });
  }, []);

  const onSave = async () => {
    if (!userId || !show || !isDirty) return;
    const isFirstConfirmation = memory?.setlist_confirmed_at == null;
    setSaving(true);
    try {
      const { items, encoreStartIndex } = rowsToDraft(rows);
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
      if (isFirstConfirmation) {
        router.replace(`/show/${show.id}/share-night`);
      } else {
        router.back();
      }
    } catch {
      Alert.alert(t('memory.setlist.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const listHeader = useMemo((): ReactElement => {
    return (
      <View style={styles.headerBlock}>
        <Text style={[typography.body, { color: tokens.textSecondary }]}>
          {t('memory.setlist.subtitle', { artist: show?.artist.name ?? '' })}
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
          {rowsToDraft(rows).items.length === 0 ? (
            <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{t('memory.setlist.empty')}</Text>
          ) : null}
        </View>
      </View>
    );
  }, [note, rating, rows, show?.artist.name, t, tokens.accent, tokens.background, tokens.separator, tokens.surface, tokens.text, tokens.textSecondary]);

  const listFooter = useMemo((): ReactElement => {
    return (
      <View style={[styles.footerBlock, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PillButton title={t('memory.setlist.addSong')} variant="secondary" onPress={() => setSearchOpen(true)} />

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

        <View style={styles.footerActions}>
          <PillButton
            title={t('showNightShare.shareAction')}
            variant="secondary"
            onPress={() => router.push(`/show/${showId}/share-night`)}
          />
          <PillButton
            disabled={!isDirty || saving}
            title={saving ? t('common.loading') : t('memory.setlist.save')}
            variant="primary"
            onPress={() => void onSave()}
          />
        </View>
      </View>
    );
  }, [
    addSongToList,
    artistSongsQuery.isLoading,
    insets.bottom,
    isDirty,
    isRemoteSearching,
    saving,
    searchOpen,
    searchRaw,
    router,
    searchResults,
    showId,
    t,
    tokens.accent,
    tokens.separator,
    tokens.surface,
    tokens.text,
    tokens.textSecondary,
  ]);

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
    <View style={{ flex: 1, backgroundColor: tokens.background }}>
      <SetlistDraggableList
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        listRef={listRef}
        rows={rows}
        onRowsChange={setRows}
        onToggleHighlight={onToggleHighlight}
        onTogglePlayed={onTogglePlayed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  footerBlock: {
    gap: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  headerBlock: {
    gap: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  noteInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
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
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
