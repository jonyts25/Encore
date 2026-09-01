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

export async function listUpcomingShows(): Promise<ShowWithRelations[]> {
  const supabase = createSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .gte('show_date', now)
    .order('show_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ShowWithRelations[];
}

export async function getShowById(showId: string): Promise<ShowWithRelations | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_SELECT)
    .eq('id', showId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ShowWithRelations | null) ?? null;
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
