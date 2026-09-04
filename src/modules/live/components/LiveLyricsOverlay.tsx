import { LinearGradient } from 'expo-linear-gradient';
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
      <LinearGradient
        colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        style={styles.gradient}
      />

      <View pointerEvents="box-none" style={[styles.content, { paddingTop: contentTopInset }]}>
        {isLoading ? (
          <Text style={styles.message}>{t('common.loading')}</Text>
        ) : null}

        {!isLoading && isUnavailable ? (
          <Text style={styles.message}>{t('live.lyricsUnavailable')}</Text>
        ) : null}

        {!isLoading && !isUnavailable ? (
          <LyricsScrollPanel
            compact
            showModeLabel={false}
            variant="overlayTopFade"
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
    paddingHorizontal: 14,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 12,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  panel: {
    flex: 1,
  },
});
