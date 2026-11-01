import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShowNightShareCardModel,
  type ShowNightShareSongItem,
} from '../../showNightShareCardLogic';
import { SHARE_NIGHT, SHARE_NIGHT_FONTS } from '../../showNightShareTheme';
import { ShowNightShareWatermark } from './ShowNightShareWatermark';

type Props = {
  model: ShowNightShareCardModel;
  onVisualReady?: () => void;
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
}: {
  song: ShowNightShareSongItem;
  compact: boolean;
}) {
  const text = (
    <Text numberOfLines={2} style={[styles.songLine, compact && styles.songLineCompact]}>
      {song.position}. {song.title}
    </Text>
  );

  if (song.is_highlight) {
    return (
      <View style={styles.highlightWrap}>
        <View style={styles.highlightOval}>{text}</View>
      </View>
    );
  }

  return text;
}

export function ShowNightShareSetlistTemplate({ model, onVisualReady }: Props) {
  const { t } = useTranslation();
  const { main, encore } = partitionSongs(model.confirmedSongs);
  const twoColumns = model.confirmedSongs.length > 16;
  const compact = twoColumns;

  useEffectReady(onVisualReady);

  const renderBlock = (songs: ShowNightShareSongItem[]) => {
    if (twoColumns) {
      const half = Math.ceil(songs.length / 2);
      const left = songs.slice(0, half);
      const right = songs.slice(half);
      return (
        <View style={styles.twoCol}>
          <View style={styles.col}>
            {left.map((song) => (
              <SongLine key={`${song.position}-${song.title}`} compact={compact} song={song} />
            ))}
          </View>
          <View style={styles.col}>
            {right.map((song) => (
              <SongLine key={`${song.position}-${song.title}`} compact={compact} song={song} />
            ))}
          </View>
        </View>
      );
    }
    return songs.map((song) => (
      <SongLine key={`${song.position}-${song.title}`} compact={compact} song={song} />
    ));
  };

  return (
    <View style={styles.root}>
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
                <Text style={styles.encoreLabel}>{t('showNightShare.setlist.encore')}</Text>
                {renderBlock(encore)}
              </>
            ) : null}
          </View>
        </View>
      </View>
      <ShowNightShareWatermark />
    </View>
  );
}

function useEffectReady(onVisualReady?: () => void) {
  useEffect(() => {
    onVisualReady?.();
  }, [onVisualReady]);
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: SHARE_NIGHT.background,
    height: SHARE_CARD_HEIGHT,
    justifyContent: 'space-between',
    width: SHARE_CARD_WIDTH,
  },
  paperWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 56,
    paddingTop: 80,
  },
  tape: {
    backgroundColor: 'rgba(244,242,238,0.55)',
    borderRadius: 4,
    height: 44,
    position: 'absolute',
    top: 120,
    width: 140,
    zIndex: 2,
  },
  paper: {
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    elevation: 8,
    minHeight: SHARE_CARD_HEIGHT * 0.72,
    paddingBottom: 48,
    paddingHorizontal: 48,
    paddingTop: 56,
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
    fontSize: 44,
    lineHeight: 48,
  },
  headerDate: {
    color: '#444',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 28,
    marginBottom: 28,
    marginTop: 8,
  },
  list: {
    gap: 6,
  },
  songLine: {
    color: '#1A1A21',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 32,
    lineHeight: 38,
  },
  songLineCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  highlightWrap: {
    marginVertical: 2,
  },
  highlightOval: {
    alignSelf: 'flex-start',
    borderColor: SHARE_NIGHT.purple,
    borderRadius: 999,
    borderWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  encoreRule: {
    backgroundColor: 'rgba(26,26,33,0.25)',
    height: 2,
    marginVertical: 16,
  },
  encoreLabel: {
    color: '#555',
    fontFamily: SHARE_NIGHT_FONTS.setlist,
    fontSize: 28,
    marginBottom: 8,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 24,
  },
  col: {
    flex: 1,
    gap: 6,
  },
});
