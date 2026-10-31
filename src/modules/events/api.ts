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
import { artistPageUserStatuses, buildArtistShowSections } from './artistShowSectionsLogic';
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
  local_date,
  time_confirmed,
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

export async function listUpcomingShowsForArtistFromSupabase(artistId: string): Promise<Show[]> {
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

type PopularArtistsResponse = {
  artists: ArtistSummary[];
};

export async function fetchExplorePopularArtists(): Promise<ArtistSummary[]> {
  try {
    const data = await apiFetch<PopularArtistsResponse>('/api/explore/popular-artists');
    return data.artists;
  } catch {
    return [];
  }
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
  return data.shows.filter((show) => isShowActive(show));
}

export async function fetchAttendedShowsForMap(userId: string): Promise<Show[]> {
  const resolvedUserId = await resolveUserIdForData(userId);

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', resolvedUserId)
    .eq('status', 'fui');

  if (userShowsError) throw userShowsError;

  const attendedIds = (userShows ?? []).map((row) => row.show_id);
  return listShowsByIdsFromSupabase(attendedIds, { upcomingOnly: false });
}

type VenueGeocodeApiResult = {
  result?: {
    status?: 'updated' | 'not_found' | 'skipped';
    venueId?: string;
  };
};

export async function geocodeVenueWithAuth(
  venueId: string,
  accessToken: string
): Promise<'updated' | 'not_found' | 'skipped' | 'error'> {
  if (!venueId.trim()) return 'error';
  try {
    const data = await apiFetch<VenueGeocodeApiResult>(
      `/api/venues/${encodeURIComponent(venueId)}/geocode`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const status = data.result?.status;
    if (status === 'updated' || status === 'not_found' || status === 'skipped') {
      return status;
    }
    return 'error';
  } catch {
    return 'error';
  }
}

export async function requestVenueGeocode(venueId: string, accessToken: string): Promise<void> {
  await geocodeVenueWithAuth(venueId, accessToken);
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

  const [allGoing, interestedRaw, attended, followedShows] = await Promise.all([
    listShowsByIdsFromSupabase(goingIds, { upcomingOnly: false }),
    listShowsByIdsFromSupabase(interestedIds),
    listShowsByIdsFromSupabase(attendedIds, { upcomingOnly: false }),
    token ? fetchUpcomingShows({ followed: true, accessToken: token }) : Promise.resolve([]),
  ]);

  const interested = interestedRaw.filter((show) => isShowActive(show));
  const going = allGoing.filter((show) => isShowActive(show));
  const goingAttendancePending = allGoing.filter(
    (show) => !isShowActive(show) && getShowPhase(show) === 'past'
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
    const other = upcomingForArtist.filter((show) => isShowActive(show));
    return { yours: [], other, attended: [] };
  }

  const { data: userShows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('show_id, status')
    .eq('user_id', userId)
    .in('status', artistPageUserStatuses());

  if (userShowsError) throw userShowsError;

  const attendedIds = (userShows ?? [])
    .filter((row) => row.status === 'fui')
    .map((row) => row.show_id);

  const attendedShows = await listShowsByIdsFromSupabase(attendedIds, { upcomingOnly: false });

  return buildArtistShowSections({
    upcomingForArtist,
    userShowRows: (userShows ?? []) as { show_id: string; status: ShowStatus }[],
    attendedShows,
    artistId,
  });
}

export async function fetchShowByIdFromSupabase(showId: string): Promise<Show | null> {
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .eq('id', showId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeShowRow(data as ShowRowFromSupabase);
}

export async function searchVenuesNearby(params: {
  query: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
  limit?: number;
}): Promise<
  Array<
    VenueSummary & {
      distance_km: number | null;
    }
  >
> {
  const { data, error } = await supabase.rpc('search_venues_nearby', {
    p_query: params.query,
    p_lat: params.lat ?? null,
    p_lng: params.lng ?? null,
    p_city: params.city.trim() || null,
    p_radius_km: params.radiusKm ?? 75,
    p_limit: params.limit ?? 20,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<VenueSummary & { distance_km: number | null }>;
}

export async function searchVenues(
  query: string,
  options?: { city?: string; limit?: number }
): Promise<VenueSummary[]> {
  const limit = options?.limit ?? 20;
  const trimmed = query.trim();
  let request = supabase
    .from('venues')
    .select('id, name, city, country, lat, lng, capacity')
    .order('name', { ascending: true })
    .limit(limit);

  if (trimmed) {
    request = request.ilike('name', `%${trimmed}%`);
  }
  if (options?.city?.trim()) {
    request = request.ilike('city', `%${options.city.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as VenueSummary[];
}

export async function fetchShowById(showId: string): Promise<Show | null> {
  try {
    const data = await apiFetch<ShowDetailResponse>(`/api/shows/${showId}`);
    return data.show;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    try {
      const fromSupabase = await fetchShowByIdFromSupabase(showId);
      if (fromSupabase) return fromSupabase;
    } catch {
      // Prefer original API error when both fail.
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
    const canUseSupabaseFallback =
      status === 'voy' ||
      status === 'interesado' ||
      status === 'no_fui' ||
      status === 'fui';
    if (canUseSupabaseFallback) {
      if (
        status === 'no_fui' &&
        error instanceof ApiError &&
        (error.status === 400 || error.status === 422)
      ) {
        return upsertUserShowStatusViaSupabase(showId, status, userId);
      }
      if (
        !(error instanceof ApiError) ||
        error.status >= 500 ||
        error.status === 408 ||
        error.status === 404 ||
        error.status === 502 ||
        error.status === 503
      ) {
        return upsertUserShowStatusViaSupabase(showId, status, userId);
      }
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
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatShowVenueLine(venue: Show['venue']): string {
  return `${venue.name} · ${venue.city}, ${venue.country}`;
}
