import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Glass, GlassIconButton } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';

type LensChip = {
  id: string;
  label: string;
};

type LiveConcertBottomBarProps = {
  zoomControl?: ReactNode;
  lensChips?: LensChip[];
  selectedLensId?: string | null;
  isRecording: boolean;
  isSaving: boolean;
  torchOn: boolean;
  torchDisabled: boolean;
  flipDisabled: boolean;
  dualVideoAvailable: boolean;
  dualVideoActive: boolean;
  onSelectLens?: (id: string) => void;
  onToggleRecording: () => void;
  onFlip: () => void;
  onSelectDualVideo: (enabled: boolean) => void;
  onToggleTorch: () => void;
};

export function LiveConcertBottomBar({
  zoomControl,
  lensChips = [],
  selectedLensId,
  isRecording,
  isSaving,
  torchOn,
  torchDisabled,
  flipDisabled,
  dualVideoAvailable,
  dualVideoActive,
  onSelectLens,
  onToggleRecording,
  onFlip,
  onSelectDualVideo,
  onToggleTorch,
}: LiveConcertBottomBarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      {zoomControl ? (
        zoomControl
      ) : lensChips.length > 0 ? (
        <Glass style={styles.zoomPill}>
          <View style={styles.lensRow}>
            {lensChips.map((chip) => {
              const selected = chip.id === selectedLensId;
              return (
                <Pressable
                  key={chip.id}
                  accessibilityRole="button"
                  onPress={() => onSelectLens?.(chip.id)}
                  style={[styles.lensChip, selected && styles.lensChipSelected]}>
                  <Text style={[styles.lensChipText, selected && styles.lensChipTextSelected]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Glass>
      ) : null}

      {dualVideoAvailable ? (
        <Glass style={styles.modePill}>
          <View style={styles.modeRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isRecording}
              onPress={() => onSelectDualVideo(false)}
              style={[styles.modeChip, !dualVideoActive && styles.modeChipSelected]}>
              <Text style={[styles.modeText, !dualVideoActive && styles.modeTextSelected]}>
                {t('live.videoModeSingle')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isRecording}
              onPress={() => onSelectDualVideo(true)}
              style={[styles.modeChip, dualVideoActive && styles.modeChipSelected]}>
              <Text style={[styles.modeText, dualVideoActive && styles.modeTextSelected]}>
                {t('live.videoModeDual')}
              </Text>
            </Pressable>
          </View>
        </Glass>
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

const styles = StyleSheet.create({
  caption: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  lensChip: {
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    minWidth: 38,
    paddingHorizontal: 8,
  },
  lensChipSelected: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  lensChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  lensChipTextSelected: {
    color: darkTokens.zoomSelected,
    fontWeight: '700',
  },
  lensRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    width: '100%',
  },
  modeChip: {
    borderRadius: 16,
    flex: 1,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modeChipSelected: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modePill: {
    borderRadius: 18,
    padding: 4,
    width: '72%',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  modeText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  recordInner: {
    backgroundColor: darkTokens.recording,
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
  zoomPill: {
    borderRadius: 24,
    padding: 5,
  },
});
