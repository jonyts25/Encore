import { useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

function clampZoom(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function usePinchZoom(initialZoom = 0) {
  const [zoom, setZoom] = useState(initialZoom);
  const zoomRef = useRef(initialZoom);
  const baseZoomRef = useRef(initialZoom);

  zoomRef.current = zoom;

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          baseZoomRef.current = zoomRef.current;
        })
        .onUpdate((event) => {
          runOnJS(setZoom)(clampZoom(baseZoomRef.current * event.scale));
        }),
    []
  );

  return { zoom, pinchGesture };
}
