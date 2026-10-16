import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Glass, GlassIconButton } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';

type LensChip = {
  id: string;
  label: string;
};

type LiveConcertBottomBarProps = {
  lensChips: LensChip[];
  selectedLensId: string | null;
  isRecording: boolean;
  isSaving: boolean;
  torchOn: boolean;
  torchDisabled: boolean;
  flipDisabled: boolean;
  multiCamActive: boolean;
  multiCamDisabled: boolean;
  onSelectLens: (id: string) => void;
  onToggleRecording: () => void;
  onFlip: () => void;
  onToggleMultiCam: () => void;
  onToggleTorch: () => void;
};

export function LiveConcertBottomBar({
  lensChips,
  selectedLensId,
  isRecording,
  isSaving,
  torchOn,
  torchDisabled,
  flipDisabled,
  multiCamDisabled,
  onSelectLens,
  onToggleRecording,
  onFlip,
  onToggleMultiCam,
  onToggleTorch,
}: LiveConcertBottomBarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      {lensChips.length > 0 ? (
        <Glass style={styles.zoomPill}>
          <View style={styles.lensRow}>
            {lensChips.map((chip) => {
              const selected = chip.id === selectedLensId;
              return (
                <Pressable
                  key={chip.id}
                  accessibilityRole="button"
                  onPress={() => onSelectLens(chip.id)}
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
          onLongPress={
            Platform.OS === 'ios' && !multiCamDisabled ? onToggleMultiCam : undefined
          }
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
    gap: 16,
    width: '100%',
  },
  zoomPill: {
    borderRadius: 24,
    padding: 5,
  },
});
