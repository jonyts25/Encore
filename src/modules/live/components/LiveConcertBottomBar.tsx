import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

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
  multiCamActive,
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

      <View style={styles.recRow}>
        {isRecording ? <View style={styles.recDot} /> : null}
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onToggleRecording}
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </Pressable>
        <Text style={styles.recLabel}>
          {isSaving
            ? t('live.saving')
            : isRecording
              ? t('live.stopRecording')
              : t('live.startRecording')}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel={t('live.flipCamera')}
          accessibilityRole="button"
          disabled={flipDisabled}
          onPress={onFlip}
          style={[
            styles.actionButton,
            styles.flipButton,
            flipDisabled && styles.actionButtonDisabled,
          ]}>
          <Ionicons name="sync-outline" size={20} color="#fff" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={multiCamDisabled}
          onPress={onToggleMultiCam}
          style={[
            styles.actionButton,
            multiCamActive && styles.actionButtonActive,
            multiCamDisabled && styles.actionButtonDisabled,
          ]}>
          <Text style={[styles.actionText, multiCamActive && styles.actionTextActive]}>
            {t('live.multiCamShort')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={torchOn ? t('live.flashOn') : t('live.flashOff')}
          accessibilityRole="button"
          disabled={torchDisabled}
          onPress={onToggleTorch}
          style={[
            styles.actionButton,
            torchOn && styles.actionButtonActive,
            torchDisabled && styles.actionButtonDisabled,
          ]}>
          <Text style={[styles.actionText, torchOn && styles.actionTextActive]}>
            {t('live.torchShort')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  actionButtonDisabled: {
    opacity: 0.35,
  },
  flipButton: {
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionTextActive: {
    color: '#ffe566',
  },
  lensChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lensChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  lensChipText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '700',
  },
  lensChipTextSelected: {
    color: '#fff',
  },
  lensRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  recDot: {
    backgroundColor: '#ff4d4f',
    borderRadius: 999,
    height: 8,
    position: 'absolute',
    right: '34%',
    top: 8,
    width: 8,
  },
  recLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  recRow: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  recordButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: '#fff',
    borderRadius: 34,
    borderWidth: 3,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  recordButtonActive: {
    borderColor: '#ff4d4f',
  },
  recordInner: {
    backgroundColor: '#ff4d4f',
    borderRadius: 999,
    height: 46,
    width: 46,
  },
  recordInnerActive: {
    borderRadius: 8,
    height: 24,
    width: 24,
  },
  root: {
    gap: 16,
  },
});
