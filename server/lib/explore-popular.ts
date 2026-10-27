import type { ArtistSummary } from './types';
import { createSupabaseAdminClient } from './supabase';

type VoyRow = {
  show_id: string;
  shows: {
    artist_id: string;
    artist: ArtistSummary | ArtistSummary[] | null;
  } | null;
};

export async function listPopularArtistsByVoy(limit = 12): Promise<ArtistSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('user_shows')
    .select('show_id, shows!inner(artist_id, artist:artists(id, name, image_url, genres))')
    .eq('status', 'voy');

  if (error) throw error;

  const counts = new Map<string, { artist: ArtistSummary; count: number }>();

  for (const row of (data ?? []) as VoyRow[]) {
    const show = row.shows;
    if (!show) continue;
    const artistRaw = show.artist;
    const artist = Array.isArray(artistRaw) ? artistRaw[0] : artistRaw;
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
