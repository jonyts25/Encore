export {
  buildGeniusSearchUrl,
  buildSpotifySearchUrl,
  fetchLyrics,
} from './api';
export { LyricsScreenContent } from './components/LyricsScreenContent';
export { LyricsScrollPanel } from './components/LyricsScrollPanel';
export { useLyricsAutoScroll } from './hooks/useLyricsAutoScroll';
export { useLyrics } from './hooks/useLyrics';
export {
  buildDisplayLines,
  detectScrollMode,
  resolveActiveLineIndex,
  splitPlainLyricsLines,
} from './scrollLogic';
export type {
  LyricsResult,
  LyricsScrollMode,
  LyricsSearchResponse,
  SyncedLine,
} from './types';
