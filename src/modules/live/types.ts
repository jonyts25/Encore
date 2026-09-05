export type LiveRecordingState = 'idle' | 'recording' | 'saving';

export type LiveLayoutMode = 'overlay' | 'split' | 'floating';

/** CameraView zoom is normalized 0–1; UI shows ~1×–3× over that range. */
export const LIVE_ZOOM_MIN = 1;
export const LIVE_ZOOM_MAX = 3;

export function zoomNormalizedToDisplay(normalized: number): number {
  const clamped = Math.min(1, Math.max(0, normalized));
  return LIVE_ZOOM_MIN + clamped * (LIVE_ZOOM_MAX - LIVE_ZOOM_MIN);
}

export function displayToZoomNormalized(display: number): number {
  const clamped = Math.min(LIVE_ZOOM_MAX, Math.max(LIVE_ZOOM_MIN, display));
  return (clamped - LIVE_ZOOM_MIN) / (LIVE_ZOOM_MAX - LIVE_ZOOM_MIN);
}

export function formatZoomDisplay(normalized: number): string {
  const display = zoomNormalizedToDisplay(normalized);
  const rounded = Math.round(display * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}×` : `${rounded.toFixed(1)}×`;
}

export const LIVE_FLOATING_HEIGHTS = [140, 200, 260] as const;

export type LiveFloatingHeight = (typeof LIVE_FLOATING_HEIGHTS)[number];
