import { apiFetch, ApiError } from '@/core/api/client';
import { supabase } from '@/core/api/supabase';
import { readLastKnownUser } from '@/modules/identity/lastKnownUser';

import type {
  ArtistShowSections,
  ArtistSummary,
  HomeShowSections,
  Show,
  ShowStatus,
  UserShow,
  VenueSummary,
} from './types';
import { activeCutoffIso, getShowPhase, hasConfirmedTime, isShowActive } from './visibility';

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

type ShowRowFromSupabase = Omit<Show, 'artist' | 'venue'> & {
  artist: ArtistSummary | ArtistSummary[] | null;
  venue: VenueSummary | VenueSummary[] | null;
};

function normalizeShowRow(row: ShowRowFromSupabase): Show {
  const artist = Array.isArray(row.artist) ? row.artist[0] : row.artist;
  const venue = Array.isArray(row.venue) ? row.venue[0] : row.venue;
  if (!artist || !venue) {
    throw new Error(`Show ${row.id} is missing artist or venue relation`);
  }
  return { ...row, artist, venue };
}

async function listShowsByIdsFromSupabase(
  showIds: string[],
  options?: { upcomingOnly?: boolean }
): Promise<Show[]> {
  if (showIds.length === 0) return [];

  let query = supabase.from('shows').select(SHOW_SELECT).in('id', showIds);

  if (options?.upcomingOnly !== false) {
    query = query.gte('show_date', activeCutoffIso()).order('show_date', { ascending: true });
  } else {
    query = query.order('show_date', { ascending: false });
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map((row) => normalizeShowRow(row as ShowRowFromSupabase));
}

async function listUpcomingShowsForArtistFromSupabase(artistId: string): Promise<Show[]> {
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .eq('artist_id', artistId)
    .gte('show_date', activeCutoffIso())
    .order('show_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeShowRow(row as ShowRowFromSupabase));
}

async function resolveAccessToken(accessToken?: string | null): Promise<string | null> {
  if (accessToken) return accessToken;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function resolveUserIdForData(userId: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getSession();
  const fromSession = data.session?.user?.id;
  if (fromSession) return fromSession;
  const saved = readLastKnownUser()?.id;
  if (saved) return saved;
  throw new Error('Unauthorized');
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

export async function fetchHomeShowSections(
  userId: string,
  accessToken?: string | null
): Promise<HomeShowSections> {
  const resolvedUserId = await resolveUserIdForData(userId);
  const token = await resolveAccessToken(accessToken);

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', resolvedUserId);

  if (userShowsError) throw userShowsError;

  const rows = userShows ?? [];
  const showIdsWithAnyStatus = new Set(rows.map((row) => row.show_id));
  const goingIds = rows.filter((row) => row.status === 'voy').map((row) => row.show_id);
  const interestedIds = rows
    .filter((row) => row.status === 'interesado')
    .map((row) => row.show_id);
  const attendedIds = rows.filter((row) => row.status === 'fui').map((row) => row.show_id);

  const [allGoing, interested, attended, followedShows] = await Promise.all([
    listShowsByIdsFromSupabase(goingIds, { upcomingOnly: false }),
    listShowsByIdsFromSupabase(interestedIds),
    listShowsByIdsFromSupabase(attendedIds, { upcomingOnly: false }),
    token ? fetchUpcomingShows({ followed: true, accessToken: token }) : Promise.resolve([]),
  ]);

  const going = allGoing.filter((show) => isShowActive(show.show_date));
  const goingAttendancePending = allGoing.filter(
    (show) => !isShowActive(show.show_date) && getShowPhase(show.show_date) === 'past'
  );

  const forYou = followedShows.filter((show) => !showIdsWithAnyStatus.has(show.id));

  return { going, goingAttendancePending, interested, forYou, attended };
}

export async function fetchArtistShowSections(
  artistId: string,
  userId: string | null
): Promise<ArtistShowSections> {
  const upcomingForArtist = await listUpcomingShowsForArtistFromSupabase(artistId);

  if (!userId) {
    return { yours: [], other: upcomingForArtist, attended: [] };
  }

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', userId)
    .in('status', ['voy', 'interesado', 'fui']);

  if (userShowsError) throw userShowsError;

  const activeRows = (userShows ?? []).filter((row) => row.status !== 'fui');
  const attendedIds = (userShows ?? [])
    .filter((row) => row.status === 'fui')
    .map((row) => row.show_id);

  const yoursIds = new Set(activeRows.map((row) => row.show_id));
  const yours = upcomingForArtist.filter((show) => yoursIds.has(show.id));
  const other = upcomingForArtist.filter((show) => !yoursIds.has(show.id));

  const attendedShows = await listShowsByIdsFromSupabase(attendedIds, { upcomingOnly: false });
  const attended = attendedShows.filter((show) => show.artist_id === artistId);

  return { yours, other, attended };
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

async function upsertUserShowStatusViaSupabase(
  showId: string,
  status: ShowStatus,
  userId: string
): Promise<UserShow> {
  const resolvedUserId = await resolveUserIdForData(userId);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_shows')
    .upsert(
      {
        user_id: resolvedUserId,
        show_id: showId,
        status,
        ticket_ref: null,
        updated_at: now,
      },
      { onConflict: 'user_id,show_id' }
    )
    .select('user_id, show_id, status, ticket_ref, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as UserShow;
}

export async function setShowStatus(
  showId: string,
  status: ShowStatus,
  accessToken: string | null,
  userId: string
): Promise<UserShow> {
  const token = await resolveAccessToken(accessToken);
  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const data = await apiFetch<SetShowStatusResponse>(`/api/shows/${showId}/status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, ticket_ref: null }),
    });
    return data.user_show;
  } catch (error) {
    // Old Railway deploys may reject `no_fui` before the API is updated; RLS allows direct upsert.
    if (
      status === 'no_fui' &&
      error instanceof ApiError &&
      (error.status === 400 || error.status === 422)
    ) {
      return upsertUserShowStatusViaSupabase(showId, status, userId);
    }
    throw error;
  }
}

export async function removeShowStatus(showId: string, accessToken: string): Promise<void> {
  try {
    await apiFetch<{ removed: boolean }>(`/api/shows/${showId}/status`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      const { error: dbError } = await supabase.from('user_shows').delete().eq('show_id', showId);
      if (dbError) throw dbError;
      return;
    }
    throw error;
  }
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

  if (!hasConfirmedTime(showDate)) {
    const dateOnly = new Intl.DateTimeFormat(tag, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
    const unconfirmed =
      locale.startsWith('en') ? 'Time to be confirmed' : 'Hora por confirmar';
    return `${dateOnly} · ${unconfirmed}`;
  }

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
