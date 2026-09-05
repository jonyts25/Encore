import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import type { LiveZoomPreset } from '../types';
import { LIVE_ZOOM_VALUES } from '../types';

type LiveZoomChipsProps = {
  preset: LiveZoomPreset;
  onChange: (preset: LiveZoomPreset) => void;
  topInset: number;
};

const PRESETS: LiveZoomPreset[] = [1, 2, 3];

export function LiveZoomChips({ preset, onChange, topInset }: LiveZoomChipsProps) {
  const { t } = useTranslation();

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: topInset + 8 }]}>
      {PRESETS.map((level) => {
        const active = preset === level;
        return (
          <Pressable
            key={level}
            accessibilityLabel={t('live.zoomLevel', { level })}
            accessibilityRole="button"
            onPress={() => onChange(level)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{level}x</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function zoomPresetToValue(preset: LiveZoomPreset): number {
  return LIVE_ZOOM_VALUES[preset];
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  chipTextActive: {
    color: '#111',
  },
  container: {
    alignItems: 'flex-end',
    gap: 6,
    position: 'absolute',
    right: 16,
    zIndex: 25,
  },
});
