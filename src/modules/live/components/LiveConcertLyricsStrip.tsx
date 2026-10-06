import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
} from 'react-native';

import { useTranslation } from '@/core/i18n';
import {
  LyricsResyncModal,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
  useLyricsAutoScroll,
} from '@/modules/lyrics';
import type { SyncedLine } from '@/modules/lyrics';

type LiveConcertLyricsStripProps = {
  plainLyrics?: string;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  isLoading: boolean;
  isUnavailable: boolean;
};

const SWIPE_THRESHOLD = 40;

export function LiveConcertLyricsStrip({
  plainLyrics,
  syncedLines,
  durationSeconds,
  isLoading,
  isUnavailable,
}: LiveConcertLyricsStripProps) {
  const { t } = useTranslation();
  const [resyncOpen, setResyncOpen] = useState(false);

  const safePlainLyrics = normalizePlainLyrics(plainLyrics);
  const safeSyncedLines = normalizeSyncedLines(syncedLines);
  const safeDurationSeconds = normalizeDurationSeconds(durationSeconds);

  const {
    displayLines,
    activeLineIndex,
    isPlaying,
    playPause,
    stepLine,
    seekToLine,
  } = useLyricsAutoScroll({
    plainLyrics: safePlainLyrics,
    syncedLines: safeSyncedLines,
    durationSeconds: safeDurationSeconds,
    autoStart: true,
  });

  const stepLineRef = useRef(stepLine);
  stepLineRef.current = stepLine;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -SWIPE_THRESHOLD) {
            stepLineRef.current(1);
            return;
          }
          if (gestureState.dx >= SWIPE_THRESHOLD) {
            stepLineRef.current(-1);
          }
        },
      }),
    []
  );

  const accessibilityLabel = useMemo(() => {
    const current = displayLines[activeLineIndex] ?? '';
    const stateLabel = isPlaying ? t('lyrics.pause') : t('lyrics.resume');
    return `${current}. ${stateLabel}. ${t('lyrics.gestureHint')}`;
  }, [activeLineIndex, displayLines, isPlaying, t]);

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'increment':
        stepLine(1);
        break;
      case 'decrement':
        stepLine(-1);
        break;
      case 'activate':
        playPause();
        break;
      case 'longpress':
        setResyncOpen(true);
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Text style={styles.message}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isUnavailable || displayLines.length === 0) {
    return (
      <View style={styles.root}>
        <Text style={styles.message}>{t('live.lyricsUnavailable')}</Text>
      </View>
    );
  }

  const previousLine = activeLineIndex > 0 ? displayLines[activeLineIndex - 1] : '';
  const currentLine = displayLines[activeLineIndex] ?? '';
  const nextLine =
    activeLineIndex < displayLines.length - 1 ? displayLines[activeLineIndex + 1] : '';

  return (
    <>
      <Pressable
        accessibilityActions={[
          { name: 'increment', label: t('lyrics.nextLine') },
          { name: 'decrement', label: t('lyrics.previousLine') },
          { name: 'activate', label: isPlaying ? t('lyrics.pause') : t('lyrics.resume') },
          { name: 'longpress', label: t('lyrics.resync') },
        ]}
        accessibilityHint={t('lyrics.gestureHint')}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        onAccessibilityAction={handleAccessibilityAction}
        onLongPress={() => setResyncOpen(true)}
        onPress={playPause}
        style={styles.root}
        {...panResponder.panHandlers}>
        {!isPlaying ? <Text style={styles.pausedBadge}>{t('lyrics.paused')}</Text> : null}
        <Text style={styles.previousLine} numberOfLines={2}>
          {previousLine}
        </Text>
        <Text style={styles.currentLine} numberOfLines={3}>
          {currentLine}
        </Text>
        <Text style={styles.nextLine} numberOfLines={2}>
          {nextLine}
        </Text>
      </Pressable>

      <LyricsResyncModal
        activeLineIndex={activeLineIndex}
        lines={displayLines}
        visible={resyncOpen}
        onClose={() => setResyncOpen(false)}
        onSelectLine={seekToLine}
      />
    </>
  );
}

const styles = StyleSheet.create({
  currentLine: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  nextLine: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  pausedBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  previousLine: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
  },
  root: {
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
