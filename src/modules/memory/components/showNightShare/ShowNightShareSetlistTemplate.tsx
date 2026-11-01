import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import type { ShowNightShareCardModel, ShowNightShareSongItem } from '../../showNightShareCardLogic';
import { SHARE_STORY_SAFE_BOTTOM, SHARE_STORY_SAFE_TOP } from '../../showNightShareSafeZones';
import { SHARE_NIGHT, SHARE_NIGHT_FONTS } from '../../showNightShareTheme';
import { ShowNightShareCanvas } from './ShowNightShareCanvas';

type Props = {
  model: ShowNightShareCardModel;
  fontsReady?: boolean;
  onVisualReady?: () => void;
  interactive?: boolean;
  onToggleHighlight?: (songId: string) => void;
};

function partitionSongs(songs: ShowNightShareSongItem[]): {
  main: ShowNightShareSongItem[];
  encore: ShowNightShareSongItem[];
} {
  const main = songs.filter((s) => !s.is_encore);
  const encore = songs.filter((s) => s.is_encore);
  return { main, encore };
}

function SongLine({
  song,
  compact,
  interactive,
  onToggleHighlight,
}: {
  song: ShowNightShareSongItem;
  compact: boolean;
  interactive?: boolean;
  onToggleHighlight?: (songId: string) => void;
}) {
  const text = (
    <Text numberOfLines={2} style={[styles.songLine, compact && styles.songLineCompact]}>
      {song.position}. {song.title}
    </Text>
  );

  const body =
    song.is_highlight && !interactive ? (
      <View style={styles.highlightWrap}>
        <View style={styles.highlightOval}>{text}</View>
      </View>
    ) : (
      text
    );

  if (interactive && onToggleHighlight) {
    return (
      <Pressable onPress={() => onToggleHighlight(song.songId)}>
        {song.is_highlight ? (
          <View style={styles.highlightWrap}>
            <View style={styles.highlightOval}>{text}</View>
          </View>
        ) : (
          body
        )}
      </Pressable>
    );
  }

  if (song.is_highlight) {
    return (
      <View style={styles.highlightWrap}>
        <View style={styles.highlightOval}>{text}</View>
      </View>
    );
  }

  return body;
}

export function ShowNightShareSetlistTemplate({
  model,
  fontsReady = true,
  onVisualReady,
  interactive,
  onToggleHighlight,
}: Props) {
  const { t } = useTranslation();
  const { main, encore } = partitionSongs(model.confirmedSongs);
  const twoColumns = model.confirmedSongs.length > 16;
  const compact = twoColumns;

  useEffect(() => {
    if (fontsReady) {
      onVisualReady?.();
    }
  }, [fontsReady, onVisualReady]);

  const renderBlock = (songs: ShowNightShareSongItem[]) => {
    if (twoColumns) {
      const half = Math.ceil(songs.length / 2);
      const left = songs.slice(0, half);
      const right = songs.slice(half);
      return (
        <View style={styles.twoCol}>
          <View style={styles.col}>
            {left.map((song) => (
              <SongLine
                key={song.songId}
                compact={compact}
                interactive={interactive}
                song={song}
                onToggleHighlight={onToggleHighlight}
              />
            ))}
          </View>
          <View style={styles.col}>
            {right.map((song) => (
              <SongLine
                key={song.songId}
                compact={compact}
                interactive={interactive}
                song={song}
                onToggleHighlight={onToggleHighlight}
              />
            ))}
          </View>
        </View>
      );
    }
    return songs.map((song) => (
      <SongLine
        key={song.songId}
        compact={compact}
        interactive={interactive}
        song={song}
        onToggleHighlight={onToggleHighlight}
      />
    ));
  };

  return (
    <ShowNightShareCanvas>
      <View style={styles.safe}>
        <View style={styles.paperWrap}>
          <View style={styles.tape} />
          <View style={styles.paper}>
            <Text numberOfLines={2} style={styles.headerArtist}>
              {model.artistName}
            </Text>
            <Text style={styles.headerDate}>{model.ticketDateLabel}</Text>

            <View style={styles.list}>
              {renderBlock(main)}
              {encore.length > 0 ? (
                <>
                  <View style={styles.encoreRule} />
                  <Text style={styles.encoreLabel}>{t('showNightShare.setlist.encoreMarker')}</Text>
                  {renderBlock(encore)}
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </ShowNightShareCanvas>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: SHARE_STORY_SAFE_BOTTOM + 56,
    paddingHorizontal: 56,
    paddingTop: SHARE_STORY_SAFE_TOP,
  },
  paperWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  tape: {
    backgroundColor: 'rgba(244,242,238,0.45)',
    borderRadius: 4,
    height: 40,
    position: 'absolute',
    top: -18,
    transform: [{ rotate: '4deg' }],
    width: 130,
    zIndex: 3,
  },
  paper: {
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    elevation: 8,
    paddingBottom: 40,
    paddingHorizontal: 40,
    paddingTop: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    transform: [{ rotate: '-2deg' }],
    width: '100%',
  },
  headerArtist: {
    color: '#1A1A21',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 40,
    lineHeight: 44,
  },
  headerDate: {
    color: '#444',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 26,
    marginBottom: 20,
    marginTop: 6,
  },
  list: {
    gap: 4,
  },
  songLine: {
    color: '#1A1A21',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 28,
    lineHeight: 34,
  },
  songLineCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  highlightWrap: {
    marginVertical: 1,
  },
  highlightOval: {
    alignSelf: 'flex-start',
    borderColor: SHARE_NIGHT.purple,
    borderRadius: 999,
    borderWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  encoreRule: {
    backgroundColor: 'rgba(26,26,33,0.25)',
    height: 2,
    marginVertical: 12,
  },
  encoreLabel: {
    color: '#555',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 26,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 20,
  },
  col: {
    flex: 1,
    gap: 4,
  },
});
