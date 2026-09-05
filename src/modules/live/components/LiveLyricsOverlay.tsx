import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { LyricsScrollPanel } from '@/modules/lyrics';
import type { SyncedLine } from '@/modules/lyrics';

import type { LiveLayoutMode } from '../types';

type LiveLyricsOverlayProps = {
  contentTopInset: number;
  isLoading: boolean;
  isUnavailable: boolean;
  plainLyrics?: string;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  layout?: LiveLayoutMode;
  style?: ViewStyle;
};

export function LiveLyricsOverlay({
  contentTopInset,
  isLoading,
  isUnavailable,
  plainLyrics,
  syncedLines,
  durationSeconds,
  layout = 'overlay',
  style,
}: LiveLyricsOverlayProps) {
  const { t } = useTranslation();

  const containerStyle =
    layout === 'split'
      ? styles.splitContainer
      : layout === 'floating'
        ? styles.floatingContainer
        : styles.overlayContainer;

  return (
    <View pointerEvents="box-none" style={[containerStyle, style]}>
      <View style={[styles.content, layout === 'overlay' && { paddingTop: contentTopInset }]}>
        {isLoading ? (
          <Text style={styles.message}>{t('common.loading')}</Text>
        ) : null}

        {!isLoading && isUnavailable ? (
          <Text style={styles.message}>{t('live.lyricsUnavailable')}</Text>
        ) : null}

        {!isLoading && !isUnavailable ? (
          <LyricsScrollPanel
            autoStart
            compact
            showModeLabel={false}
            variant="overlay"
            durationSeconds={durationSeconds}
            plainLyrics={plainLyrics}
            syncedLines={syncedLines}
            style={styles.panel}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  floatingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flex: 1,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 12,
    textAlign: 'center',
  },
  overlayContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    height: '40%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  panel: {
    flex: 1,
  },
  splitContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    flex: 1,
  },
});
