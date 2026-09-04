import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useLyricsAutoScroll } from '../hooks/useLyricsAutoScroll';
import {
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
} from '../scrollLogic';
import type { SyncedLine } from '../types';

type LyricsScrollPanelProps = {
  plainLyrics?: string | null;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  compact?: boolean;
  variant?: 'default' | 'overlay';
  autoStart?: boolean;
  style?: ViewStyle;
  showModeLabel?: boolean;
};

// Fallback strides until onLayout measures each row (incl. multi-line wrap).
const SCROLL_LINE_GAP = 4;
const OVERLAY_COMPACT_LINE_HEIGHT = 46;
const COMPACT_LINE_HEIGHT = 38;
const FULL_LINE_HEIGHT = 46;

function scrollOffsetForLine(
  activeIndex: number,
  lineHeights: number[],
  fallbackLineHeight: number,
  pinActiveToTop: boolean
): number {
  if (activeIndex <= 0) return 0;

  const lineStride = (index: number) => (lineHeights[index] ?? fallbackLineHeight) + SCROLL_LINE_GAP;

  if (pinActiveToTop) {
    let offset = 0;
    for (let i = 0; i < activeIndex; i += 1) {
      offset += lineStride(i);
    }
    return offset;
  }

  let offset = 0;
  for (let i = 0; i < activeIndex - 1; i += 1) {
    offset += lineStride(i);
  }
  return offset;
}

export function LyricsScrollPanel({
  plainLyrics,
  syncedLines,
  durationSeconds,
  compact = false,
  variant = 'default',
  autoStart = false,
  style,
  showModeLabel = true,
}: LyricsScrollPanelProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const lineHeightsRef = useRef<number[]>([]);
  const activeLineIndexRef = useRef(0);
  const overlay = variant === 'overlay';
  const fallbackLineHeight =
    overlay && compact ? OVERLAY_COMPACT_LINE_HEIGHT : compact ? COMPACT_LINE_HEIGHT : FULL_LINE_HEIGHT;
  const pinActiveToTop = overlay && compact;
  const compactControls = compact || overlay;

  const safePlainLyrics = normalizePlainLyrics(plainLyrics);
  const safeSyncedLines = normalizeSyncedLines(syncedLines);
  const safeDurationSeconds = normalizeDurationSeconds(durationSeconds);

  const {
    scrollMode,
    displayLines,
    activeLineIndex,
    isPlaying,
    modeLabelKey,
    start,
    reset,
    toggle,
  } = useLyricsAutoScroll({
    plainLyrics: safePlainLyrics,
    syncedLines: safeSyncedLines,
    durationSeconds: safeDurationSeconds,
    autoStart,
  });

  activeLineIndexRef.current = activeLineIndex;

  const scrollToActiveLine = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({
        y: scrollOffsetForLine(index, lineHeightsRef.current, fallbackLineHeight, pinActiveToTop),
        animated: true,
      });
    },
    [fallbackLineHeight, pinActiveToTop]
  );

  useEffect(() => {
    lineHeightsRef.current = [];
  }, [displayLines.length, safePlainLyrics, safeSyncedLines]);

  useEffect(() => {
    scrollToActiveLine(activeLineIndex);
  }, [activeLineIndex, scrollToActiveLine]);

  const handleLineLayout = useCallback(
    (index: number, height: number) => {
      if (lineHeightsRef.current[index] === height) return;
      lineHeightsRef.current[index] = height;
      if (index <= activeLineIndexRef.current) {
        scrollToActiveLine(activeLineIndexRef.current);
      }
    },
    [scrollToActiveLine]
  );

  const primaryActionLabel =
    scrollMode === 'manual' && !isPlaying && activeLineIndex === 0
      ? t('lyrics.start')
      : isPlaying
        ? t('lyrics.pause')
        : t('lyrics.resume');

  return (
    <ThemedView
      style={[
        styles.container,
        compact && styles.containerCompact,
        overlay && styles.containerOverlay,
        style,
      ]}>
      {showModeLabel ? (
        <ThemedText
          lightColor={overlay ? '#FFFFFF' : undefined}
          darkColor={overlay ? '#FFFFFF' : undefined}
          style={[styles.modeLabel, compact && styles.modeLabelCompact, overlay && styles.modeLabelOverlay]}>
          {t(modeLabelKey)}
        </ThemedText>
      ) : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, overlay && styles.scrollContentOverlay]}
        nestedScrollEnabled
        showsVerticalScrollIndicator={!compact}>
        {displayLines.map((line, index) => {
          const isActive = index === activeLineIndex;
          return (
            <View
              key={`${index}-${line}`}
              onLayout={(event) => {
                handleLineLayout(index, event.nativeEvent.layout.height);
              }}
              style={[
                styles.lineRow,
                overlay && styles.lineRowOverlay,
                isActive && (overlay ? styles.lineRowActiveOverlay : styles.lineRowActive),
              ]}>
              <ThemedText
                lightColor={overlay ? '#FFFFFF' : undefined}
                darkColor={overlay ? '#FFFFFF' : undefined}
                style={[
                  styles.lineText,
                  compact && !overlay && styles.lineTextCompact,
                  overlay && styles.lineTextOverlay,
                  overlay && compact && styles.lineTextOverlayCompact,
                  isActive && styles.lineTextActive,
                ]}>
                {line}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.controls, compactControls && styles.controlsCompact]}>
        {compactControls ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (scrollMode === 'manual' && !isPlaying && activeLineIndex === 0) {
                  start();
                } else {
                  toggle();
                }
              }}
              style={({ pressed }) => [
                styles.compactControl,
                styles.compactControlPrimary,
                pressed && styles.compactControlPressed,
              ]}>
              <Text style={styles.compactControlPrimaryText}>{primaryActionLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={reset}
              style={({ pressed }) => [
                styles.compactControl,
                styles.compactControlSecondary,
                pressed && styles.compactControlPressed,
              ]}>
              <Text style={styles.compactControlSecondaryText}>{t('lyrics.restart')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Button
              title={primaryActionLabel}
              onPress={() => {
                if (scrollMode === 'manual' && !isPlaying && activeLineIndex === 0) {
                  start();
                } else {
                  toggle();
                }
              }}
            />
            <Button title={t('lyrics.restart')} variant="secondary" onPress={reset} />
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 8,
  },
  containerCompact: {
    flex: 1,
    marginTop: 0,
  },
  containerOverlay: {
    backgroundColor: 'transparent',
  },
  controls: {
    gap: 8,
  },
  controlsCompact: {
    flexDirection: 'row',
    gap: 6,
  },
  compactControl: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compactControlPressed: {
    opacity: 0.85,
  },
  compactControlPrimary: {
    backgroundColor: '#4DA3FF',
  },
  compactControlPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  compactControlSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  compactControlSecondaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  lineRow: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  lineRowOverlay: {
    alignItems: 'center',
  },
  lineRowActive: {
    backgroundColor: 'rgba(77, 163, 255, 0.18)',
  },
  lineRowActiveOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  lineText: {
    fontSize: 17,
    lineHeight: 28,
    opacity: 0.65,
  },
  lineTextOverlay: {
    opacity: 0.75,
  },
  lineTextOverlayCompact: {
    alignSelf: 'stretch',
    fontSize: 21,
    lineHeight: 30,
    textAlign: 'center',
  },
  lineTextActive: {
    fontWeight: '700',
    opacity: 1,
  },
  lineTextCompact: {
    fontSize: 15,
    lineHeight: 22,
  },
  modeLabel: {
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  modeLabelCompact: {
    opacity: 0.85,
  },
  modeLabelOverlay: {
    opacity: 0.9,
  },
  scrollContent: {
    gap: SCROLL_LINE_GAP,
    paddingBottom: 8,
  },
  scrollContentOverlay: {
    alignItems: 'center',
  },
});
