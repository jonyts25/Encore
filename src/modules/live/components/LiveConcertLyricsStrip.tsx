import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { typography } from '@/core/ui/theme';
import {
  LyricsResyncModal,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
  useLyricsAutoScroll,
} from '@/modules/lyrics';

import {
  LIVE_LYRICS_FALLBACK_LINE_HEIGHT,
  LIVE_LYRICS_LINE_GAP,
  scrollOffsetForActiveLine,
} from '../liveLyricsScrollLogic';

type LiveConcertLyricsStripProps = {
  plainLyrics?: string;
  syncedLines?: import('@/modules/lyrics').SyncedLine[] | null;
  durationSeconds?: number | null;
  isLoading: boolean;
  isUnavailable: boolean;
  scrollMaxHeight?: number;
};

const SWIPE_THRESHOLD = 40;
const LINE_FLASH_MS = 520;

type LiveLyricsLineRowProps = {
  index: number;
  line: string;
  isActive: boolean;
  flash: boolean;
  onContinueFromLine: (index: number) => void;
  onLayoutHeight: (index: number, height: number) => void;
};

const LiveLyricsLineRow = memo(function LiveLyricsLineRow({
  index,
  line,
  isActive,
  flash,
  onContinueFromLine,
  onLayoutHeight,
}: LiveLyricsLineRowProps) {
  const continueRef = useRef(onContinueFromLine);
  continueRef.current = onContinueFromLine;

  const gesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          runOnJS(continueRef.current)(index);
        }),
    [index]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={(event) => {
          onLayoutHeight(index, event.nativeEvent.layout.height);
        }}
        style={[
          styles.lineRow,
          isActive && styles.lineRowActive,
          flash && styles.lineRowFlash,
        ]}>
        <Text style={[styles.lineText, isActive && styles.lineTextActive]}>{line}</Text>
      </View>
    </GestureDetector>
  );
});

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
  const [flashLineIndex, setFlashLineIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const lineHeightsRef = useRef<number[]>([]);

  const safePlainLyrics = normalizePlainLyrics(plainLyrics);
  const safeSyncedLines = normalizeSyncedLines(syncedLines);
  const safeDurationSeconds = normalizeDurationSeconds(durationSeconds);

  const {
    displayLines,
    activeLineIndex,
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

  useEffect(() => {
    if (flashLineIndex === null) return undefined;
    const timer = setTimeout(() => setFlashLineIndex(null), LINE_FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashLineIndex]);

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

  const handleScrollBeginDrag = () => {
    pause();
    setUserBrowsing(true);
  };

  const continueFromLine = useCallback(
    (lineIndex: number) => {
      seekToLine(lineIndex);
      setUserBrowsing(false);
      start();
      setFlashLineIndex(lineIndex);
      hapticSelection();
      requestAnimationFrame(() => scrollToActiveLine(true));
    },
    [scrollToActiveLine, seekToLine, start]
  );

  const backToCurrentLine = () => {
    setUserBrowsing(false);
    scrollToActiveLine(true);
    start();
  };

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
    return `${current}. ${t('live.lyricsAccessibilityHint')}`;
  }, [activeLineIndex, displayLines, t]);

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'increment':
        stepLine(1);
        break;
      case 'decrement':
        stepLine(-1);
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
          { name: 'longpress', label: t('lyrics.resync') },
        ]}
        accessibilityHint={t('live.lyricsAccessibilityHint')}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        onAccessibilityAction={handleAccessibilityAction}
        pointerEvents="box-none"
        style={styles.root}
        {...horizontalSwipeHandlers}>
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          scrollEnabled
          scrollEventThrottle={16}
          onScrollBeginDrag={handleScrollBeginDrag}
          showsVerticalScrollIndicator={false}
          style={[styles.scrollViewport, { height: scrollMaxHeight }]}>
          <View style={styles.scrollContent}>
            {displayLines.map((line, index) => (
              <LiveLyricsLineRow
                key={`${index}-${line.slice(0, 16)}`}
                flash={flashLineIndex === index}
                index={index}
                isActive={index === activeLineIndex}
                line={line}
                onContinueFromLine={continueFromLine}
                onLayoutHeight={handleLineLayout}
              />
            ))}
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
          continueFromLine(index);
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
  lineRowFlash: {
    backgroundColor: 'rgba(255,214,10,0.28)',
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
