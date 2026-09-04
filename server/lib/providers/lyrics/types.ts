import type { SyncedLine } from './lrc';

export type { SyncedLine };

export type LyricsMatch = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  instrumental: boolean;
  hasPlainLyrics: boolean;
  hasSyncedLyrics: boolean;
};

export type Lyrics = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  plainLyrics: string;
  instrumental: boolean;
  durationSeconds: number | null;
  attribution: string;
};

export type SyncedLyrics = {
  id: string;
  lrc: string;
  lines: SyncedLine[];
  durationSeconds: number | null;
  attribution: string;
};

export interface LyricsProvider {
  search(artist: string, title: string): Promise<LyricsMatch[]>;
  fetch(id: string): Promise<Lyrics>;
  fetchSynced(id: string): Promise<SyncedLyrics | null>;
  readonly attribution: string;
  readonly allowsCommercialUse: boolean;
}
