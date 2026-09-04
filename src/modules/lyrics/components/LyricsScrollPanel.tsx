import { useEffect, useRef } from 'react';
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
import { LyricsOutlineText } from './LyricsOutlineText';

type LyricsScrollPanelProps = {
  plainLyrics?: string | null;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  compact?: boolean;
  variant?: 'default' | 'overlay' | 'overlayTopFade';
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
  const overlayTopFade = variant === 'overlayTopFade';
  const overlay = variant === 'overlay' || overlayTopFade;
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
  });

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

  return (
    <ThemedView
      style={[
        styles.container,
        compact && styles.containerCompact,
        overlay && !overlayTopFade && styles.containerOverlay,
        overlayTopFade && styles.containerTopFade,
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
            <View
              key={`${index}-${line}`}
              style={[
                styles.lineRow,
                isActive && !overlayTopFade && (overlay ? styles.lineRowActiveOverlay : styles.lineRowActive),
                isActive && overlayTopFade && styles.lineRowActiveTopFade,
              ]}>
              {overlayTopFade ? (
                <LyricsOutlineText active={isActive} compact={compact}>
                  {line}
                </LyricsOutlineText>
              ) : (
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
              )}
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
  containerTopFade: {
    backgroundColor: 'transparent',
    marginTop: 0,
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
  lineRowActive: {
    backgroundColor: 'rgba(77, 163, 255, 0.18)',
  },
  lineRowActiveOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  lineRowActiveTopFade: {
    transform: [{ scale: 1.02 }],
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
