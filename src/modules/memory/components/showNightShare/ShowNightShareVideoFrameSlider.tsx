import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';

type Props = {
  durationSec: number;
  valueSec: number;
  onChange: (sec: number) => void;
};

export function ShowNightShareVideoFrameSlider({ durationSec, valueSec, onChange }: Props) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();
  const max = Math.max(1, durationSec);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    // reserved for future drag; step buttons below for accessibility
    void event;
  };

  const step = Math.max(0.5, max / 20);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
        {t('showNightShare.videoFrameLabel')}
      </Text>
      <View style={[styles.track, { backgroundColor: tokens.separator }]} onLayout={onTrackLayout}>
        <View
          style={[
            styles.fill,
            { backgroundColor: tokens.accent, width: `${Math.min(100, (valueSec / max) * 100)}%` },
          ]}
        />
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.step}
          onPress={() => onChange(Math.max(0, valueSec - step))}>
          <Text style={{ color: tokens.text }}>−</Text>
        </Pressable>
        <Text style={[typography.body, { color: tokens.textSecondary }]}>
          {valueSec.toFixed(1)}s / {max.toFixed(1)}s
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.step}
          onPress={() => onChange(Math.min(max, valueSec + step))}>
          <Text style={{ color: tokens.text }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
    width: '100%',
  },
  track: {
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
