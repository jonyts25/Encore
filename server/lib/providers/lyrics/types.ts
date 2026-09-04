export type LyricsMatch = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  instrumental: boolean;
  hasPlainLyrics: boolean;
};

export type Lyrics = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  plainLyrics: string;
  instrumental: boolean;
  attribution: string;
};

export type SyncedLyrics = {
  id: string;
  lrc: string;
  attribution: string;
};

export interface LyricsProvider {
  search(artist: string, title: string): Promise<LyricsMatch[]>;
  fetch(id: string): Promise<Lyrics>;
  fetchSynced(id: string): Promise<SyncedLyrics | null>;
  readonly attribution: string;
  readonly allowsCommercialUse: boolean;
}
