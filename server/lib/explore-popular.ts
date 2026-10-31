import type { ArtistSummary } from './types';
import { createSupabaseAdminClient } from './supabase';

type VoyShowRelation = {
  artist_id: string;
  artist: ArtistSummary | ArtistSummary[] | null;
};

/** Supabase may return embedded `shows` / `artist` as object or array depending on relation inference. */
type VoyRow = {
  show_id: string;
  shows: VoyShowRelation | VoyShowRelation[] | null;
};

function firstShowRelation(row: VoyRow): VoyShowRelation | null {
  const shows = row.shows;
  if (!shows) return null;
  return Array.isArray(shows) ? (shows[0] ?? null) : shows;
}

function normalizeArtist(
  artist: ArtistSummary | ArtistSummary[] | null | undefined
): ArtistSummary | null {
  if (!artist) return null;
  return Array.isArray(artist) ? (artist[0] ?? null) : artist;
}

export async function listPopularArtistsByVoy(limit = 12): Promise<ArtistSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('user_shows')
    .select('show_id, shows!inner(artist_id, artist:artists(id, name, image_url, genres))')
    .eq('status', 'voy');

  if (error) throw error;

  const counts = new Map<string, { artist: ArtistSummary; count: number }>();

  for (const row of (data ?? []) as unknown as VoyRow[]) {
    const show = firstShowRelation(row);
    if (!show) continue;
    const artist = normalizeArtist(show.artist);
    if (!artist) continue;
    const existing = counts.get(artist.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(artist.id, { artist, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.artist.name.localeCompare(b.artist.name))
    .slice(0, limit)
    .map((entry) => entry.artist);
}
