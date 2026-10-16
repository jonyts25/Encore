import { StyleSheet, Text, View } from 'react-native';

import { useEncoreTheme } from '../theme';
import { typography } from '../theme/typography';

import { Glass } from './Glass';

type StatusPillProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'accent' | 'recording';
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const { tokens } = useEncoreTheme();

  if (tone === 'recording') {
    return (
      <View style={[styles.recording, { backgroundColor: tokens.recording }]}>
        <View style={styles.recordingDot} />
        <Text style={[typography.secondarySemibold, styles.recordingText]}>{label}</Text>
      </View>
    );
  }

  const textColor = tone === 'success' ? tokens.success : '#FFFFFF';

  return (
    <Glass style={styles.glass}>
      <Text
        style={[
          typography.footnoteSemibold,
          {
            color: textColor,
          },
        ]}>
        {label}
      </Text>
    </Glass>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recording: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  recordingDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  recordingText: {
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
