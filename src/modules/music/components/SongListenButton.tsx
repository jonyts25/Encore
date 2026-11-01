import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

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
  const [resolving, setResolving] = useState(false);

  return (
    <Pressable
      accessibilityLabel={t('musicStreaming.listenSong')}
      accessibilityRole="button"
      disabled={resolving}
      hitSlop={8}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      onPress={() =>
        openSearch(buildSongSearchQuery(artistName, songTitle), {
          intent: 'song',
          artistName,
          songTitle,
          onResolveStart: () => setResolving(true),
          onResolveEnd: () => setResolving(false),
        })
      }>
      <View style={styles.iconWrap}>
        <Ionicons color={tokens.textSecondary} name="musical-notes-outline" size={size} />
        {resolving ? (
          <ActivityIndicator color={tokens.accent} size="small" style={styles.spinner} />
        ) : null}
      </View>
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
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spinner: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
});
