import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';

import { buildSongSearchQuery } from '../streamingLinks';
import { useOpenMusicSearch } from '../useOpenMusicSearch';

type SongListenButtonProps = {
  artistName: string;
  songTitle: string;
  size?: number;
};

export function SongListenButton({ artistName, songTitle, size = 22 }: SongListenButtonProps) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();
  const { openSearch } = useOpenMusicSearch();

  return (
    <Pressable
      accessibilityLabel={t('musicStreaming.listenSong')}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      onPress={() =>
        openSearch(buildSongSearchQuery(artistName, songTitle), {
          intent: 'song',
          artistName,
          songTitle,
        })
      }>
      <Ionicons color={tokens.textSecondary} name="musical-notes-outline" size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
  },
  pressed: {
    opacity: 0.65,
  },
});
