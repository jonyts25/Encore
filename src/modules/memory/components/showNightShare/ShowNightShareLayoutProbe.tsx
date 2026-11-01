import type { LayoutChangeEvent } from 'react-native';

import type { ShareLayoutRect } from '../../showNightShareSafeZones';

export type ShareNightLayoutProbeHandler = (id: string, rect: ShareLayoutRect) => void;

export function shareNightLayoutProbe(
  id: string,
  onProbe?: ShareNightLayoutProbeHandler
): { onLayout: (event: LayoutChangeEvent) => void } {
  return {
    onLayout: (event) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      onProbe?.(id, { x, y, width, height });
    },
  };
}
