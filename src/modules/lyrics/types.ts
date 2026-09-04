export type LyricsResult = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  plainLyrics: string;
  instrumental: boolean;
  attribution: string;
};

export type LyricsSearchResponse = {
  lyrics: {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    plain_lyrics: string;
    instrumental: boolean;
  };
  attribution: string;
};
