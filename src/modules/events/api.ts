import { apiFetch, ApiError } from '@/core/api/client';
import { supabase } from '@/core/api/supabase';

import type { ArtistShowSections, HomeShowSections, Show, ShowStatus, UserShow } from './types';

type UpcomingShowsResponse = {
  shows: Show[];
};

type FetchUpcomingShowsOptions = {
  followed?: boolean;
  accessToken?: string;
};

type ShowDetailResponse = {
  show: Show;
};

type SetShowStatusResponse = {
  user_show: UserShow;
};

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

async function listShowsByIdsFromSupabase(showIds: string[]): Promise<Show[]> {
  if (showIds.length === 0) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .in('id', showIds)
    .gte('show_date', now)
    .order('show_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Show[];
}

async function listUpcomingShowsForArtistFromSupabase(artistId: string): Promise<Show[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .eq('artist_id', artistId)
    .gte('show_date', now)
    .order('show_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Show[];
}

export async function fetchUpcomingShows(options?: FetchUpcomingShowsOptions): Promise<Show[]> {
  const params = new URLSearchParams();
  if (options?.followed) {
    params.set('followed', 'true');
  }

  const query = params.toString();
  const path = query ? `/api/shows/upcoming?${query}` : '/api/shows/upcoming';
  const headers: Record<string, string> = {};

  if (options?.followed && options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const data = await apiFetch<UpcomingShowsResponse>(path, { headers });
  return data.shows;
}

export async function fetchHomeShowSections(accessToken: string): Promise<HomeShowSections> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiError('Unauthorized', 401);
  }

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', user.id);

  if (userShowsError) throw userShowsError;

  const rows = userShows ?? [];
  const showIdsWithAnyStatus = new Set(rows.map((row) => row.show_id));
  const goingIds = rows.filter((row) => row.status === 'voy').map((row) => row.show_id);
  const interestedIds = rows
    .filter((row) => row.status === 'interesado')
    .map((row) => row.show_id);

  const [going, interested, followedShows] = await Promise.all([
    listShowsByIdsFromSupabase(goingIds),
    listShowsByIdsFromSupabase(interestedIds),
    fetchUpcomingShows({ followed: true, accessToken }),
  ]);

  const forYou = followedShows.filter((show) => !showIdsWithAnyStatus.has(show.id));

  return { going, interested, forYou };
}

export async function fetchArtistShowSections(
  artistId: string,
  _accessToken?: string | null
): Promise<ArtistShowSections> {
  const upcomingForArtist = await listUpcomingShowsForArtistFromSupabase(artistId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { yours: [], other: upcomingForArtist };
  }

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', user.id)
    .in('status', ['voy', 'interesado']);

  if (userShowsError) throw userShowsError;

  const yoursIds = new Set((userShows ?? []).map((row) => row.show_id));
  const yours = upcomingForArtist.filter((show) => yoursIds.has(show.id));
  const other = upcomingForArtist.filter((show) => !yoursIds.has(show.id));

  return { yours, other };
}

export async function fetchShowById(showId: string): Promise<Show | null> {
  try {
    const data = await apiFetch<ShowDetailResponse>(`/api/shows/${showId}`);
    return data.show;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function setShowStatus(
  showId: string,
  status: ShowStatus,
  accessToken: string
): Promise<UserShow> {
  const data = await apiFetch<SetShowStatusResponse>(`/api/shows/${showId}/status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, ticket_ref: null }),
  });
  return data.user_show;
}

/** Reads current user status from Supabase (RLS). No backend GET exists yet. */
export async function getUserShowStatus(showId: string): Promise<ShowStatus | null> {
  const { data, error } = await supabase
    .from('user_shows')
    .select('status')
    .eq('show_id', showId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.status) return null;
  return data.status as ShowStatus;
}

export function formatShowDate(showDate: string, locale: string): string {
  const date = new Date(showDate);
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function formatShowVenueLine(venue: Show['venue']): string {
  return `${venue.name} · ${venue.city}, ${venue.country}`;
}
