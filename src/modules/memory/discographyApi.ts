import { supabase } from '@/core/api/supabase';
import { fetchAttendedShowsForMap } from '@/modules/events/api';

import type {
  DiscographyFavoriteArtist,
  DiscographyPayload,
  DiscographyShowEntry,
  ShowMediaThumb,
  ShowMemorySummary,
} from './types';

const emptyMemory = (): ShowMemorySummary => ({
  memoryId: null,
  rating: null,
  setlistConfirmedAt: null,
  songsPlayedCount: 0,
});

async function fetchMemoriesForShows(
  userId: string,
  showIds: string[]
): Promise<Map<string, ShowMemorySummary>> {
  const map = new Map<string, ShowMemorySummary>();
  if (showIds.length === 0) return map;

  const { data: memories, error } = await supabase
    .from('memories')
    .select('id, show_id, rating, setlist_confirmed_at')
    .eq('user_id', userId)
    .in('show_id', showIds);

  if (error) throw error;

  const memoryRows = memories ?? [];
  const memoryIds = memoryRows.map((row) => row.id as string);
  const songCountByMemory = new Map<string, number>();

  if (memoryIds.length > 0) {
    const { data: songRows, error: songsError } = await supabase
      .from('memory_songs')
      .select('memory_id')
      .in('memory_id', memoryIds);

    if (songsError) throw songsError;

    for (const row of songRows ?? []) {
      const memoryId = row.memory_id as string;
      songCountByMemory.set(memoryId, (songCountByMemory.get(memoryId) ?? 0) + 1);
    }
  }

  for (const row of memoryRows) {
    const memoryId = row.id as string;
    map.set(row.show_id as string, {
      memoryId,
      rating: (row.rating as number | null) ?? null,
      setlistConfirmedAt: (row.setlist_confirmed_at as string | null) ?? null,
      songsPlayedCount: songCountByMemory.get(memoryId) ?? 0,
    });
  }

  return map;
}

async function fetchFirstMediaByShow(
  userId: string,
  showIds: string[]
): Promise<Map<string, ShowMediaThumb>> {
  const map = new Map<string, ShowMediaThumb>();
  if (showIds.length === 0) return map;

  const { data, error } = await supabase
    .from('show_media')
    .select('show_id, asset_id, media_type, taken_at')
    .eq('user_id', userId)
    .in('show_id', showIds)
    .order('taken_at', { ascending: true });

  if (error) throw error;

  for (const row of data ?? []) {
    const showId = row.show_id as string;
    if (map.has(showId)) continue;
    const mediaType = row.media_type as string;
    if (mediaType !== 'photo' && mediaType !== 'video') continue;
    map.set(showId, {
      assetId: row.asset_id as string,
      mediaType,
    });
  }

  return map;
}

async function fetchFavoriteArtists(userId: string): Promise<DiscographyFavoriteArtist[]> {
  const { data, error } = await supabase
    .from('user_artists')
    .select('artist_id, artist:artists ( id, name, image_url )')
    .eq('user_id', userId)
    .eq('is_favorite', true)
    .order('favorited_at', { ascending: false, nullsFirst: false });

  if (error) throw error;

  type Row = {
    artist: { id: string; name: string; image_url: string | null } | { id: string; name: string; image_url: string | null }[] | null;
  };

  return (data ?? ([] as Row[])).flatMap((row) => {
    const artist = Array.isArray(row.artist) ? row.artist[0] : row.artist;
    if (!artist) return [];
    return [
      {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.image_url,
      },
    ];
  });
}

export async function fetchDiscographyPayload(userId: string): Promise<DiscographyPayload> {
  const shows = await fetchAttendedShowsForMap(userId);
  const showIds = shows.map((show) => show.id);

  const [memoryByShow, mediaByShow, favoriteArtists] = await Promise.all([
    fetchMemoriesForShows(userId, showIds),
    fetchFirstMediaByShow(userId, showIds),
    fetchFavoriteArtists(userId),
  ]);

  const entries: DiscographyShowEntry[] = shows
    .map((show) => ({
      show,
      memory: memoryByShow.get(show.id) ?? emptyMemory(),
      firstMedia: mediaByShow.get(show.id) ?? null,
    }))
    .sort((a, b) => new Date(b.show.show_date).getTime() - new Date(a.show.show_date).getTime());

  return { entries, favoriteArtists };
}
