import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { hasCachedLyrics } from '@/core/db/lyricsCache';
import { useTranslation } from '@/core/i18n';
import type { ArtistSongTitle } from '@/modules/catalog/api';
import type { PredictionOtherSong, PredictedSong } from '@/modules/setlist/types';

type LiveSongPickerModalProps = {
  visible: boolean;
  artistName: string;
  predictedSongs: PredictedSong[];
  otherSongs: PredictionOtherSong[];
  repertoireSongs: ArtistSongTitle[];
  activeTitle: string;
  onClose: () => void;
  onSelect: (title: string) => void;
};

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(title: string, query: string): boolean {
  if (!query) return true;
  return title.toLowerCase().includes(query);
}

export function LiveSongPickerModal({
  visible,
  artistName,
  predictedSongs,
  otherSongs,
  repertoireSongs,
  activeTitle,
  onClose,
  onSelect,
}: LiveSongPickerModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [cachedTitles, setCachedTitles] = useState<Set<string>>(new Set());

  const query = normalizeSearch(search);

  const filteredPredicted = useMemo(
    () => predictedSongs.filter((song) => matchesSearch(song.title, query)),
    [predictedSongs, query]
  );
  const filteredOthers = useMemo(
    () => otherSongs.filter((song) => matchesSearch(song.title, query)),
    [otherSongs, query]
  );
  const filteredRepertoire = useMemo(
    () => repertoireSongs.filter((song) => matchesSearch(song.title, query)),
    [repertoireSongs, query]
  );

  const hasAnyMatch =
    filteredPredicted.length > 0 || filteredOthers.length > 0 || filteredRepertoire.length > 0;

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }

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
  }, [artistName, otherSongs, predictedSongs, repertoireSongs, visible]);

  const renderRow = (title: string, key: string) => {
    const active = title === activeTitle;
    const hasLyrics = cachedTitles.has(title);

    return (
      <Pressable
        key={key}
        onPress={() => {
          onSelect(title);
          onClose();
        }}
        style={[styles.row, active && styles.rowActive]}>
        <Text style={[styles.songTitle, active && styles.songTitleActive]}>{title}</Text>
        {hasLyrics ? (
          <Ionicons accessibilityLabel={t('live.songHasCachedLyrics')} name="document-text" size={16} color="#1d4ed8" />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{t('live.songPickerTitle')}</Text>
          <Text style={styles.subtitle}>{t('live.songPickerSubtitle')}</Text>

          <TextInput
            placeholder={t('live.songPickerSearch')}
            placeholderTextColor="#888"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView contentContainerStyle={styles.list}>
            {filteredPredicted.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('live.songPickerPredicted')}</Text>
                {filteredPredicted.map((song) => renderRow(song.title, `pred-${song.song_id}`))}
              </View>
            ) : null}

            {filteredOthers.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('live.songPickerOthers')}</Text>
                {filteredOthers.map((song) => renderRow(song.title, `other-${song.song_id}`))}
              </View>
            ) : null}

            {filteredRepertoire.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('live.songPickerRepertoire')}</Text>
                {filteredRepertoire.map((song) => renderRow(song.title, `rep-${song.id}`))}
              </View>
            ) : null}

            {!hasAnyMatch ? (
              <View style={styles.customBlock}>
                <Text style={styles.empty}>{t('live.songPickerNoMatches')}</Text>
                {query ? (
                  <Pressable
                    onPress={() => {
                      onSelect(search.trim());
                      onClose();
                    }}
                    style={styles.customButton}>
                    <Text style={styles.customButtonText}>
                      {t('live.songPickerUseCustom', { title: search.trim() })}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.empty}>{t('live.songPickerEmpty')}</Text>
                )}
              </View>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  customBlock: {
    gap: 10,
    paddingVertical: 8,
  },
  customButton: {
    alignItems: 'center',
    backgroundColor: '#eef4ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  customButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    textAlign: 'center',
  },
  empty: {
    color: '#666',
    textAlign: 'center',
  },
  list: {
    gap: 12,
    paddingBottom: 8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowActive: {
    backgroundColor: '#e8f0ff',
  },
  searchInput: {
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    color: '#111',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#444',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '72%',
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  songTitle: {
    color: '#111',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  songTitleActive: {
    color: '#1d4ed8',
  },
  subtitle: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },
  title: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
});
