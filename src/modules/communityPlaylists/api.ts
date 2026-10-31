import { supabase } from '@/core/api/supabase';
import type { MusicStreamingService } from '@/modules/music/streamingLinks';

import type { CommunityPlaylistRecord, CommunityPlaylistRow } from './types';

const PLAYLIST_COLUMNS =
  'id, tour_id, artist_id, url, service, title, created_by, created_at';

type PlaylistQueryRow = {
  id: string;
  tour_id: string | null;
  artist_id: string;
  url: string;
  service: MusicStreamingService;
  title: string | null;
  created_by: string;
  created_at: string;
};

async function fetchCreatorDisplayNames(userIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (userIds.length === 0) return map;

  const uniqueIds = [...new Set(userIds)];
  const { data, error } = await supabase.rpc('get_public_display_names', {
    p_user_ids: uniqueIds,
  });

  if (error) throw error;

  for (const row of (data ?? []) as { user_id: string; display_name: string | null }[]) {
    map.set(row.user_id, row.display_name ?? null);
  }
  return map;
}

function mapPlaylistRow(
  row: PlaylistQueryRow,
  creatorNames: Map<string, string | null>
): CommunityPlaylistRecord {
  return {
    id: row.id,
    tour_id: row.tour_id,
    artist_id: row.artist_id,
    url: row.url,
    service: row.service,
    title: row.title,
    created_by: row.created_by,
    created_at: row.created_at,
    creator_display_name: creatorNames.get(row.created_by) ?? null,
  };
}

async function fetchUseCountMap(playlistIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (playlistIds.length === 0) return map;

  const { data, error } = await supabase.rpc('get_playlist_use_counts', {
    p_playlist_ids: playlistIds,
  });

  if (error) throw error;

  for (const row of (data ?? []) as { playlist_id: string; use_count: number }[]) {
    map.set(row.playlist_id, Number(row.use_count) || 0);
  }
  return map;
}

export async function fetchCommunityPlaylists(params: {
  artistId: string;
  tourId: string | null;
}): Promise<CommunityPlaylistRow[]> {
  let query = supabase
    .from('community_playlists')
    .select(PLAYLIST_COLUMNS)
    .eq('artist_id', params.artistId);

  if (params.tourId) {
    query = query.eq('tour_id', params.tourId);
  } else {
    query = query.is('tour_id', null);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as PlaylistQueryRow[];
  const creatorNames = await fetchCreatorDisplayNames(rows.map((row) => row.created_by));
  const records = rows.map((row) => mapPlaylistRow(row, creatorNames));
  const useCounts = await fetchUseCountMap(records.map((row) => row.id));

  return records.map((record) => ({
    ...record,
    useCount: useCounts.get(record.id) ?? 0,
  }));
}

export async function insertCommunityPlaylist(params: {
  artistId: string;
  tourId: string | null;
  url: string;
  service: MusicStreamingService;
  title: string | null;
  createdBy: string;
}): Promise<CommunityPlaylistRecord> {
  const { data, error } = await supabase
    .from('community_playlists')
    .insert({
      artist_id: params.artistId,
      tour_id: params.tourId,
      url: params.url,
      service: params.service,
      title: params.title,
      created_by: params.createdBy,
    })
    .select(PLAYLIST_COLUMNS)
    .single();

  if (error) throw error;
  const creatorNames = await fetchCreatorDisplayNames([(data as PlaylistQueryRow).created_by]);
  return mapPlaylistRow(data as PlaylistQueryRow, creatorNames);
}

export async function deleteCommunityPlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase.from('community_playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

/** Returns true when a new use row was inserted. */
export async function recordCommunityPlaylistUse(
  playlistId: string,
  userId: string
): Promise<boolean> {
  const { data: existing, error: findError } = await supabase
    .from('community_playlist_uses')
    .select('playlist_id')
    .eq('playlist_id', playlistId)
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return false;

  const { error } = await supabase.from('community_playlist_uses').insert({
    playlist_id: playlistId,
    user_id: userId,
  });
  if (error) throw error;
  return true;
}
