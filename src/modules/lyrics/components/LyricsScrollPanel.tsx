import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useLyricsAutoScroll } from '../hooks/useLyricsAutoScroll';
import type { SyncedLine } from '../types';

type LyricsScrollPanelProps = {
  plainLyrics: string;
  syncedLines: SyncedLine[];
  durationSeconds: number | null;
  compact?: boolean;
  variant?: 'default' | 'overlay';
  style?: ViewStyle;
  showModeLabel?: boolean;
};

const COMPACT_LINE_HEIGHT = 28;
const FULL_LINE_HEIGHT = 34;

export function LyricsScrollPanel({
  plainLyrics,
  syncedLines,
  durationSeconds,
  compact = false,
  variant = 'default',
  style,
  showModeLabel = true,
}: LyricsScrollPanelProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const lineHeight = compact ? COMPACT_LINE_HEIGHT : FULL_LINE_HEIGHT;

  const {
    scrollMode,
    displayLines,
    activeLineIndex,
    isPlaying,
    modeLabelKey,
    start,
    reset,
    toggle,
  } = useLyricsAutoScroll({ plainLyrics, syncedLines, durationSeconds });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(activeLineIndex * lineHeight - lineHeight, 0),
      animated: true,
    });
  }, [activeLineIndex, lineHeight]);

  const primaryActionLabel =
    scrollMode === 'manual' && !isPlaying && activeLineIndex === 0
      ? t('lyrics.start')
      : isPlaying
        ? t('lyrics.pause')
        : t('lyrics.resume');

  const overlay = variant === 'overlay';

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
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={!compact}>
        {displayLines.map((line, index) => {
          const isActive = index === activeLineIndex;
          return (
            <View key={`${index}-${line}`} style={[styles.lineRow, isActive && (overlay ? styles.lineRowActiveOverlay : styles.lineRowActive)]}>
              <ThemedText
                lightColor={overlay ? '#FFFFFF' : undefined}
                darkColor={overlay ? '#FFFFFF' : undefined}
                style={[
                  styles.lineText,
                  compact && styles.lineTextCompact,
                  overlay && styles.lineTextOverlay,
                  isActive && styles.lineTextActive,
                ]}>
                {line}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.controls}>
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
  lineRow: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    gap: 4,
    paddingBottom: 8,
  },
});
