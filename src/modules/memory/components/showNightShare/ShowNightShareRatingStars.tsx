import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SHARE_NIGHT } from '../../showNightShareTheme';

type Props = {
  rating: number;
  size?: number;
};

export function ShowNightShareRatingStars({ rating, size = 40 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Ionicons
          key={value}
          color={value <= rating ? SHARE_NIGHT.starFilled : SHARE_NIGHT.starEmpty}
          name={value <= rating ? 'star' : 'star-outline'}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
});
