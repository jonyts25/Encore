export type LiveRecordingState = 'idle' | 'recording' | 'saving';

export type LiveLayoutMode = 'overlay' | 'split' | 'floating';

export type LiveZoomPreset = 1 | 2 | 3;

export const LIVE_ZOOM_VALUES: Record<LiveZoomPreset, number> = {
  1: 0,
  2: 0.5,
  3: 1,
};

export const LIVE_FLOATING_HEIGHTS = [140, 200, 260] as const;

export type LiveFloatingHeight = (typeof LIVE_FLOATING_HEIGHTS)[number];
