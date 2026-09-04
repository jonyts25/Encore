import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { LyricsScrollPanel } from '@/modules/lyrics';
import type { SyncedLine } from '@/modules/lyrics';

type LiveLyricsOverlayProps = {
  contentTopInset: number;
  isLoading: boolean;
  isUnavailable: boolean;
  plainLyrics?: string;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  style?: ViewStyle;
};

export function LiveLyricsOverlay({
  contentTopInset,
  isLoading,
  isUnavailable,
  plainLyrics,
  syncedLines,
  durationSeconds,
  style,
}: LiveLyricsOverlayProps) {
  const { t } = useTranslation();

  return (
    <View pointerEvents="box-none" style={[styles.container, style]}>
      <View style={[styles.content, { paddingTop: contentTopInset }]}>
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
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    height: '40%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 12,
    textAlign: 'center',
  },
  panel: {
    flex: 1,
  },
});
