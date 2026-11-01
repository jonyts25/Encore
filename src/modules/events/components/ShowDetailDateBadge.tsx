import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { formatShowDateBadgeParts } from '../showDetailDateBadge';
import { SHOW_DETAIL_PURPLE, SHOW_DETAIL_SURFACE } from '../showDetailTheme';

type ShowDetailDateBadgeProps = {
  showDate: string;
  locale: string;
  size?: 'large' | 'small';
  style?: ViewStyle;
};

export function ShowDetailDateBadge({
  showDate,
  locale,
  size = 'large',
  style,
}: ShowDetailDateBadgeProps) {
  const { month, day } = formatShowDateBadgeParts(showDate, locale);
  const isSmall = size === 'small';

  return (
    <View
      style={[
        isSmall ? styles.smallBadge : styles.largeBadge,
        { backgroundColor: SHOW_DETAIL_SURFACE },
        style,
      ]}>
      <Text
        style={[isSmall ? styles.smallMonth : styles.largeMonth, { color: SHOW_DETAIL_PURPLE }]}>
        {month.toUpperCase()}
      </Text>
      <Text style={[isSmall ? styles.smallDay : styles.largeDay, { color: '#FFFFFF' }]}>{day}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  largeBadge: {
    alignItems: 'center',
    borderRadius: 14,
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  largeDay: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 26,
  },
  largeMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  smallBadge: {
    alignItems: 'center',
    borderRadius: 10,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  smallDay: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 18,
  },
  smallMonth: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
