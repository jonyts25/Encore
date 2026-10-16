import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { GlassIconButton } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';

type LiveConcertBottomBarProps = {
  zoomControl?: ReactNode;
  isRecording: boolean;
  isSaving: boolean;
  torchOn: boolean;
  torchDisabled: boolean;
  flipDisabled: boolean;
  dualVideoAvailable: boolean;
  dualVideoActive: boolean;
  onToggleRecording: () => void;
  onFlip: () => void;
  onSelectDualVideo: (enabled: boolean) => void;
  onToggleTorch: () => void;
};

export function LiveConcertBottomBar({
  zoomControl,
  isRecording,
  isSaving,
  torchOn,
  torchDisabled,
  flipDisabled,
  dualVideoAvailable,
  dualVideoActive,
  onToggleRecording,
  onFlip,
  onSelectDualVideo,
  onToggleTorch,
}: LiveConcertBottomBarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      {zoomControl}

      {dualVideoAvailable ? (
        <View style={styles.modeStrip}>
          <Pressable
            accessibilityRole="button"
            disabled={isRecording}
            onPress={() => onSelectDualVideo(false)}
            style={styles.modePressable}>
            <Text style={[styles.modeText, !dualVideoActive && styles.modeTextActive]}>
              {t('live.videoModeSingle').toUpperCase()}
            </Text>
          </Pressable>
          <Text style={styles.modeSeparator}>·</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isRecording}
            onPress={() => onSelectDualVideo(true)}
            style={styles.modePressable}>
            <Text style={[styles.modeText, dualVideoActive && styles.modeTextActive]}>
              {t('live.videoModeDual').toUpperCase()}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.mainRow}>
        <GlassIconButton
          accessibilityLabel={torchOn ? t('live.flashOn') : t('live.flashOff')}
          disabled={torchDisabled}
          icon="flash"
          onPress={onToggleTorch}
        />

        <Pressable
          accessibilityLabel={
            isRecording ? t('live.stopRecording') : t('live.startRecording')
          }
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onToggleRecording}
          style={styles.recordOuter}>
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </Pressable>

        <GlassIconButton
          accessibilityLabel={t('live.flipCamera')}
          disabled={flipDisabled}
          icon="camera-reverse"
          onPress={onFlip}
        />
      </View>

      {isSaving ? <Text style={styles.caption}>{t('live.saving')}</Text> : null}
    </View>
  );
}

const tokens = darkTokens;

const styles = StyleSheet.create({
  caption: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  mainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    width: '100%',
  },
  modePressable: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  modeSeparator: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '600',
  },
  modeStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  modeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modeTextActive: {
    color: tokens.zoomSelected,
  },
  recordInner: {
    backgroundColor: tokens.recording,
    borderRadius: 999,
    height: 56,
    width: 56,
  },
  recordInnerActive: {
    borderRadius: 8,
    height: 32,
    width: 32,
  },
  recordOuter: {
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderRadius: 40,
    borderWidth: 4,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  root: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
});
