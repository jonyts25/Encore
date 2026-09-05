import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import type { PredictedSong } from '@/modules/setlist/types';

type LiveSongPickerModalProps = {
  visible: boolean;
  songs: PredictedSong[];
  activeTitle: string;
  onClose: () => void;
  onSelect: (title: string) => void;
};

export function LiveSongPickerModal({
  visible,
  songs,
  activeTitle,
  onClose,
  onSelect,
}: LiveSongPickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{t('live.songPickerTitle')}</Text>
          <Text style={styles.subtitle}>{t('live.songPickerSubtitle')}</Text>

          <ScrollView contentContainerStyle={styles.list}>
            {songs.length === 0 ? (
              <Text style={styles.empty}>{t('live.songPickerEmpty')}</Text>
            ) : (
              songs.map((song, index) => {
                const active = song.title === activeTitle;
                return (
                  <Pressable
                    key={song.song_id}
                    onPress={() => {
                      onSelect(song.title);
                      onClose();
                    }}
                    style={[styles.row, active && styles.rowActive]}>
                    <Text style={styles.rank}>{index + 1}</Text>
                    <Text style={[styles.songTitle, active && styles.songTitleActive]}>
                      {song.title}
                    </Text>
                  </Pressable>
                );
              })
            )}
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
  empty: {
    color: '#666',
    paddingVertical: 16,
    textAlign: 'center',
  },
  list: {
    gap: 8,
    paddingBottom: 8,
  },
  rank: {
    color: '#888',
    fontWeight: '700',
    width: 24,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowActive: {
    backgroundColor: '#e8f0ff',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '62%',
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
