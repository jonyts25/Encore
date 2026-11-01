import { StyleSheet, View } from 'react-native';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '../../showNightShareCardLogic';
import { SHARE_STORY_SAFE_BOTTOM } from '../../showNightShareSafeZones';
import { ShowNightShareWatermark } from './ShowNightShareWatermark';

type Props = {
  children: React.ReactNode;
  layoutProbe?: (id: string, rect: import('../../showNightShareSafeZones').ShareLayoutRect) => void;
};

export function ShowNightShareCanvas({ children }: Props) {
  return (
    <View style={styles.root}>
      {children}
      <View style={styles.watermarkSlot}>
        <ShowNightShareWatermark />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0D0D11',
    height: SHARE_CARD_HEIGHT,
    overflow: 'hidden',
    width: SHARE_CARD_WIDTH,
  },
  watermarkSlot: {
    alignItems: 'center',
    bottom: SHARE_STORY_SAFE_BOTTOM + 12,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
