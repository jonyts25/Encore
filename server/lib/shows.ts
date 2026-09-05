import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseClient } from './supabase';
import type { ShowStatus, ShowWithRelations, UserShow } from './types';

const SHOW_SELECT = `
  id,
  artist_id,
  tour_id,
  venue_id,
  show_date,
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
    capacity
  )
`;

export async function listUpcomingShows(options?: {
  followedOnly?: boolean;
  supabase?: SupabaseClient;
  userId?: string;
}): Promise<ShowWithRelations[]> {
  const supabase = options?.supabase ?? createSupabaseClient();
  const now = new Date().toISOString();

  let query = supabase
    .from('shows')
    .select(SHOW_SELECT)
    .gte('show_date', now)
    .order('show_date', { ascending: true });

  if (options?.followedOnly && options.userId) {
    const { data: follows, error: followError } = await supabase
      .from('user_artists')
      .select('artist_id')
      .eq('user_id', options.userId);

    if (followError) throw followError;

    const artistIds = (follows ?? []).map((row) => row.artist_id);
    if (artistIds.length === 0) return [];

    query = query.in('artist_id', artistIds);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as ShowWithRelations[];
}

async function listShowsByIds(
  showIds: string[],
  supabase: SupabaseClient = createSupabaseClient()
): Promise<ShowWithRelations[]> {
  if (showIds.length === 0) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .in('id', showIds)
    .gte('show_date', now)
    .order('show_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ShowWithRelations[];
}

async function listUpcomingShowsForArtist(
  artistId: string,
  supabase: SupabaseClient = createSupabaseClient()
): Promise<ShowWithRelations[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .eq('artist_id', artistId)
    .gte('show_date', now)
    .order('show_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ShowWithRelations[];
}

export type HomeShowSections = {
  going: ShowWithRelations[];
  interested: ShowWithRelations[];
  forYou: ShowWithRelations[];
};

export async function getHomeShowSections(params: {
  userId: string;
  supabase?: SupabaseClient;
}): Promise<HomeShowSections> {
  const supabase = params.supabase ?? createSupabaseClient();

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', params.userId);

  if (userShowsError) throw userShowsError;

  const rows = userShows ?? [];
  const showIdsWithAnyStatus = new Set(rows.map((row) => row.show_id));
  const goingIds = rows.filter((row) => row.status === 'voy').map((row) => row.show_id);
  const interestedIds = rows.filter((row) => row.status === 'interesado').map((row) => row.show_id);

  const [going, interested, followedShows] = await Promise.all([
    listShowsByIds(goingIds, supabase),
    listShowsByIds(interestedIds, supabase),
    listUpcomingShows({ followedOnly: true, supabase, userId: params.userId }),
  ]);

  const forYou = followedShows.filter((show) => !showIdsWithAnyStatus.has(show.id));

  return { going, interested, forYou };
}

export type ArtistShowSections = {
  yours: ShowWithRelations[];
  other: ShowWithRelations[];
};

export async function getArtistShowSections(params: {
  artistId: string;
  userId?: string | null;
  supabase?: SupabaseClient;
}): Promise<ArtistShowSections> {
  const supabase = params.supabase ?? createSupabaseClient();
  const upcomingForArtist = await listUpcomingShowsForArtist(params.artistId, supabase);

  if (!params.userId) {
    return { yours: [], other: upcomingForArtist };
  }

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', params.userId)
    .in('status', ['voy', 'interesado']);

  if (userShowsError) throw userShowsError;

  const yoursIds = new Set((userShows ?? []).map((row) => row.show_id));
  const yours = upcomingForArtist.filter((show) => yoursIds.has(show.id));
  const other = upcomingForArtist.filter((show) => !yoursIds.has(show.id));

  return { yours, other };
}

export async function getShowById(showId: string): Promise<ShowWithRelations | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .eq('id', showId)
    .maybeSingle();

  if (error) throw error;
  const show = (data as unknown as ShowWithRelations | null) ?? null;
  if (!show) return null;

  const [{ ensureVenuePhotoUrl }, { ensureArtistImageUrl }] = await Promise.all([
    import('./venue-photos'),
    import('./artist-photos'),
  ]);
  show.venue = await ensureVenuePhotoUrl(show.venue);
  show.artist = await ensureArtistImageUrl(show.artist);
  return show;
}

export async function upsertUserShowStatus(params: {
  supabase: ReturnType<typeof createSupabaseClient>;
  userId: string;
  showId: string;
  status: ShowStatus;
  ticketRef?: string | null;
}): Promise<UserShow> {
  const { supabase, userId, showId, status, ticketRef = null } = params;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_shows')
    .upsert(
      {
        user_id: userId,
        show_id: showId,
        status,
        ticket_ref: ticketRef,
        updated_at: now,
      },
      { onConflict: 'user_id,show_id' }
    )
    .select('user_id, show_id, status, ticket_ref, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as UserShow;
}

export async function deleteUserShowStatus(params: {
  supabase: ReturnType<typeof createSupabaseClient>;
  userId: string;
  showId: string;
}): Promise<void> {
  const { supabase, userId, showId } = params;

  const { error } = await supabase
    .from('user_shows')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId);

  if (error) throw error;
}
