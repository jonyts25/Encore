import { supabase } from '@/core/api/supabase';
import { listDismissedHomeFeedIds } from '@/core/db/homeFeedDismissed';

import { activeCutoffIso } from './visibility';
import type { ShowRowFromSupabase } from './homeFeedApiTypes';
import { normalizeShowRowFromSupabase } from './homeFeedApiTypes';
import { isTourShowWithinLookback } from './homeFeedLogic';
import type { HomeFeedRawData } from './homeFeedTypes';
import type { Show } from './types';

const SHOW_SELECT = `
  id,
  artist_id,
  tour_id,
  venue_id,
  show_date,
  local_date,
  time_confirmed,
  source,
  setlistfm_id,
  created_at,
  artist:artists (
    id,
    name,
    image_url,
    genres
  ),
  venue:venues (
    id,
    name,
    city,
    country,
    lat,
    lng,
    capacity,
    timezone
  )
`;

const MS_FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

async function fetchGoingCounts(showIds: string[]): Promise<Record<string, number>> {
  if (showIds.length === 0) return {};

  const { data, error } = await supabase.rpc('get_show_going_counts', {
    p_show_ids: showIds,
  });

  if (error) throw error;

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.show_id as string] = Number(row.going_count ?? 0);
  }
  return map;
}

async function countShowSongs(showIds: string[]): Promise<Map<string, number>> {
  if (showIds.length === 0) return new Map();

  const { data, error } = await supabase.from('show_songs').select('show_id').in('show_id', showIds);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.show_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function fetchHomeFeedRaw(userId: string): Promise<HomeFeedRawData> {
  const now = new Date();
  const nowIso = now.toISOString();
  const createdAfter = new Date(now.getTime() - MS_FOURTEEN_DAYS).toISOString();

  const [
    dismissedIds,
    userShowsResult,
    followedResult,
    attendedShowsResult,
  ] = await Promise.all([
    listDismissedHomeFeedIds(userId),
    supabase.from('user_shows').select('show_id, status').eq('user_id', userId),
    supabase.from('user_artists').select('artist_id').eq('user_id', userId),
    supabase
      .from('user_shows')
      .select('show_id')
      .eq('user_id', userId)
      .eq('status', 'fui'),
  ]);

  if (userShowsResult.error) throw userShowsResult.error;
  if (followedResult.error) throw followedResult.error;
  if (attendedShowsResult.error) throw attendedShowsResult.error;

  const userShowRows = userShowsResult.data ?? [];
  const markedShowIds = userShowRows.map((row) => row.show_id as string);
  const goingIds = userShowRows.filter((row) => row.status === 'voy').map((row) => row.show_id as string);
  const attendedIds = (attendedShowsResult.data ?? []).map((row) => row.show_id as string);
  const followedArtistIds = (followedResult.data ?? []).map((row) => row.artist_id as string);

  const [goingShows, attendedShows, newConcertsResult] = await Promise.all([
    goingIds.length > 0
      ? supabase.from('shows').select(SHOW_SELECT).in('id', goingIds)
      : Promise.resolve({ data: [], error: null }),
    attendedIds.length > 0
      ? supabase
          .from('shows')
          .select(SHOW_SELECT)
          .in('id', attendedIds)
          .order('show_date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    followedArtistIds.length > 0
      ? supabase
          .from('shows')
          .select(SHOW_SELECT)
          .in('artist_id', followedArtistIds)
          .gte('show_date', activeCutoffIso(now))
          .gte('created_at', createdAfter)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (goingShows.error) throw goingShows.error;
  if (attendedShows.error) throw attendedShows.error;
  if (newConcertsResult.error) throw newConcertsResult.error;

  const userGoingShows = (goingShows.data ?? []).map((row) =>
    normalizeShowRowFromSupabase(row as ShowRowFromSupabase)
  );
  const userAttendedShows = (attendedShows.data ?? []).map((row) =>
    normalizeShowRowFromSupabase(row as ShowRowFromSupabase)
  );
  const candidateNewConcerts = (newConcertsResult.data ?? []).map((row) =>
    normalizeShowRowFromSupabase(row as ShowRowFromSupabase)
  );

  const tourIds = [...new Set(userGoingShows.map((show) => show.tour_id).filter(Boolean))] as string[];

  let tourPastShows: Show[] = [];
  if (tourIds.length > 0) {
    const { data: tourShows, error: tourError } = await supabase
      .from('shows')
      .select(SHOW_SELECT)
      .in('tour_id', tourIds)
      .lt('show_date', nowIso)
      .order('show_date', { ascending: false });

    if (tourError) throw tourError;
    tourPastShows = (tourShows ?? [])
      .map((row) => normalizeShowRowFromSupabase(row as ShowRowFromSupabase))
      .filter((show) => isTourShowWithinLookback(show.show_date, now));
  }

  const tourPastIds = tourPastShows.map((show) => show.id);
  const songCounts = await countShowSongs(tourPastIds);

  const tourSetlistCandidates: HomeFeedRawData['tourSetlistCandidates'] = [];
  for (const goingShow of userGoingShows) {
    if (!goingShow.tour_id) continue;
    const past = tourPastShows.find(
      (show) => show.tour_id === goingShow.tour_id && show.id !== goingShow.id
    );
    if (!past) continue;
    const songCount = songCounts.get(past.id) ?? 0;
    if (songCount === 0) continue;
    tourSetlistCandidates.push({
      userGoingShowId: goingShow.id,
      pastShow: past,
      songCount,
    });
  }

  const countShowIds = [
    ...new Set([
      ...candidateNewConcerts.map((show) => show.id),
      ...userGoingShows.map((show) => show.id),
    ]),
  ];
  const goingCounts = await fetchGoingCounts(countShowIds);

  return {
    nowIso,
    dismissedIds,
    followedArtistIds,
    markedShowIds,
    userGoingShows,
    userAttendedShows,
    candidateNewConcerts,
    goingCounts,
    tourSetlistCandidates,
  };
}
