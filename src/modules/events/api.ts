import { apiFetch, ApiError } from '@/core/api/client';
import { supabase } from '@/core/api/supabase';

import type { Show, ShowStatus, UserShow } from './types';

type UpcomingShowsResponse = {
  shows: Show[];
};

type ShowDetailResponse = {
  show: Show;
};

type SetShowStatusResponse = {
  user_show: UserShow;
};

export async function fetchUpcomingShows(): Promise<Show[]> {
  const data = await apiFetch<UpcomingShowsResponse>('/api/shows/upcoming');
  return data.shows;
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
