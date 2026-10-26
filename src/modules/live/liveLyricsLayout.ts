import type { LiveLayoutMode } from './types';

/** Default strip (top band) — same as legacy overlay band height. */
export const LIVE_LYRICS_STRIP_HEIGHT = 240;

/** Scroll viewport max heights for each LIVE lyrics layout. */
export function liveLyricsScrollMaxHeight(
  layout: LiveLayoutMode | 'strip',
  windowHeight: number
): number {
  switch (layout) {
    case 'split':
      return Math.max(160, Math.round(windowHeight * 0.42));
    case 'floating':
      return 200;
    case 'overlay':
      return Math.max(180, Math.round(windowHeight * 0.26));
    case 'strip':
    default:
      return LIVE_LYRICS_STRIP_HEIGHT;
  }
}
