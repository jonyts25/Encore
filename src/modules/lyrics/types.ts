export type SyncedLine = {
  timestamp_seconds: number;
  line: string;
};

export type LyricsScrollMode = 'synced' | 'estimated' | 'manual';

export type LyricsResult = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  plainLyrics: string;
  instrumental: boolean;
  attribution: string;
  durationSeconds: number | null;
  syncedLines: SyncedLine[];
  scrollMode: LyricsScrollMode;
};

export type LyricsSearchResponse = {
  lyrics: {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    plain_lyrics: string;
    instrumental: boolean;
    duration_seconds: number | null;
    synced_lines: SyncedLine[];
  };
  attribution: string;
};
