import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useTranslation } from '@/core/i18n';
import { typography } from '@/core/ui/theme';
import {
  LyricsResyncModal,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
  useLyricsAutoScroll,
} from '@/modules/lyrics';
import type { SyncedLine } from '@/modules/lyrics';

import {
  isTapWithoutScroll,
  LIVE_LYRICS_FALLBACK_LINE_HEIGHT,
  LIVE_LYRICS_LINE_GAP,
  scrollOffsetForActiveLine,
} from '../liveLyricsScrollLogic';

type LiveConcertLyricsStripProps = {
  plainLyrics?: string;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  isLoading: boolean;
  isUnavailable: boolean;
  /** Fixed height for the scrollable lyrics viewport (all LIVE layouts). */
  scrollMaxHeight?: number;
};

const SWIPE_THRESHOLD = 40;

export function LiveConcertLyricsStrip({
  plainLyrics,
  syncedLines,
  durationSeconds,
  isLoading,
  isUnavailable,
  scrollMaxHeight = 240,
}: LiveConcertLyricsStripProps) {
  const { t } = useTranslation();
  const [resyncOpen, setResyncOpen] = useState(false);
  const [userBrowsing, setUserBrowsing] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const lineHeightsRef = useRef<number[]>([]);
  const didScrollRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

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
    pause,
    start,
  } = useLyricsAutoScroll({
    plainLyrics: safePlainLyrics,
    syncedLines: safeSyncedLines,
    durationSeconds: safeDurationSeconds,
    autoStart: true,
  });

  const stepLineRef = useRef(stepLine);
  stepLineRef.current = stepLine;
  const activeLineIndexRef = useRef(activeLineIndex);
  activeLineIndexRef.current = activeLineIndex;

  const scrollToActiveLine = useCallback((animated: boolean) => {
    scrollRef.current?.scrollTo({
      y: scrollOffsetForActiveLine(
        activeLineIndexRef.current,
        lineHeightsRef.current,
        LIVE_LYRICS_FALLBACK_LINE_HEIGHT,
        false
      ),
      animated,
    });
  }, []);

  useEffect(() => {
    lineHeightsRef.current = [];
  }, [displayLines.length, safePlainLyrics, safeSyncedLines]);

  useEffect(() => {
    if (userBrowsing || displayLines.length === 0) return;
    scrollToActiveLine(true);
  }, [activeLineIndex, displayLines.length, scrollToActiveLine, userBrowsing]);

  const handleLineLayout = useCallback(
    (index: number, height: number) => {
      if (lineHeightsRef.current[index] === height) return;
      lineHeightsRef.current[index] = height;
      if (!userBrowsing && index <= activeLineIndexRef.current) {
        scrollToActiveLine(false);
      }
    },
    [scrollToActiveLine, userBrowsing]
  );

  const enterUserBrowsing = useCallback(() => {
    didScrollRef.current = true;
    pause();
    setUserBrowsing(true);
  }, [pause]);

  const handleScrollBeginDrag = () => {
    enterUserBrowsing();
  };

  const handleScrollEndDrag = () => {
    didScrollRef.current = false;
  };

  const handleMomentumScrollEnd = (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
    didScrollRef.current = false;
  };

  const backToCurrentLine = () => {
    setUserBrowsing(false);
    scrollToActiveLine(true);
    start();
  };

  /** Horizontal swipe to step lines — never capture on touch start (vertical scroll stays on ScrollView). */
  const horizontalSwipeHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const absX = Math.abs(gestureState.dx);
          const absY = Math.abs(gestureState.dy);
          return absX > 14 && absX > absY * 1.35;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const absX = Math.abs(gestureState.dx);
          const absY = Math.abs(gestureState.dy);
          return absX > 14 && absX > absY * 1.35;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -SWIPE_THRESHOLD) {
            stepLineRef.current(1);
            return;
          }
          if (gestureState.dx >= SWIPE_THRESHOLD) {
            stepLineRef.current(-1);
          }
        },
      }).panHandlers,
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
        <Text style={styles.message}>{t('live.noLyricsForSong')}</Text>
      </View>
    );
  }

  return (
    <>
      <View
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
        pointerEvents="box-none"
        style={styles.root}
        {...horizontalSwipeHandlers}>
        {!isPlaying && !userBrowsing ? (
          <Text style={styles.pausedBadge}>{t('lyrics.paused')}</Text>
        ) : null}

        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          scrollEnabled
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onTouchStart={(event) => {
            didScrollRef.current = false;
            touchStartRef.current = {
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY,
              t: Date.now(),
            };
          }}
          onTouchEnd={(event) => {
            const start = touchStartRef.current;
            touchStartRef.current = null;
            if (!start) return;
            if (
              isTapWithoutScroll({
                startX: start.x,
                startY: start.y,
                endX: event.nativeEvent.pageX,
                endY: event.nativeEvent.pageY,
                startTimeMs: start.t,
                endTimeMs: Date.now(),
                didScroll: didScrollRef.current,
              })
            ) {
              playPause();
            }
          }}
          showsVerticalScrollIndicator={false}
          style={[styles.scrollViewport, { height: scrollMaxHeight }]}>
          <View style={styles.scrollContent}>
            {displayLines.map((line, index) => {
              const isActive = index === activeLineIndex;
              return (
                <View
                  key={`${index}-${line.slice(0, 16)}`}
                  onLayout={(event) => {
                    handleLineLayout(index, event.nativeEvent.layout.height);
                  }}
                  style={[styles.lineRow, isActive && styles.lineRowActive]}>
                  <Text style={[styles.lineText, isActive && styles.lineTextActive]}>{line}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {userBrowsing ? (
          <Pressable onPress={backToCurrentLine} style={styles.backToCurrentButton}>
            <Text style={styles.backToCurrentText}>{t('live.backToCurrentLine')}</Text>
          </Pressable>
        ) : null}
      </View>

      <LyricsResyncModal
        activeLineIndex={activeLineIndex}
        lines={displayLines}
        visible={resyncOpen}
        onClose={() => setResyncOpen(false)}
        onSelectLine={(index) => {
          seekToLine(index);
          setUserBrowsing(false);
          start();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backToCurrentButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backToCurrentText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  lineRow: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  lineRowActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lineText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  lineTextActive: {
    ...typography.liveCurrentLine,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
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
  root: {
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: LIVE_LYRICS_LINE_GAP,
    paddingVertical: 4,
  },
  scrollViewport: {
    width: '100%',
  },
});
