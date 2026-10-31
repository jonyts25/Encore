import type { ArtistSummary, Show, VenueSummary } from './types';

export type ShowRowFromSupabase = Omit<Show, 'artist' | 'venue'> & {
  artist: ArtistSummary | ArtistSummary[] | null;
  venue: VenueSummary | VenueSummary[] | null;
};

export function normalizeShowRowFromSupabase(row: ShowRowFromSupabase): Show {
  const artist = Array.isArray(row.artist) ? row.artist[0] : row.artist;
  const venue = Array.isArray(row.venue) ? row.venue[0] : row.venue;
  if (!artist || !venue) {
    throw new Error(`Show ${row.id} is missing artist or venue relation`);
  }
  return { ...row, artist, venue };
}
