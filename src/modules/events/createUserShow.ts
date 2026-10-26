import { supabase } from '@/core/api/supabase';

import {
  parseCreateUserShowResponse,
  type ParsedCreateUserShowResult,
  type VenueCandidatePayload,
} from './createUserShowLogic';

export type CreateUserShowInput = {
  artistId: string;
  localDate: string;
  venueId?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  venueCountry?: string | null;
  localTime?: string | null;
  timeConfirmed?: boolean;
  confirmVenueId?: string | null;
  forceCreateVenue?: boolean;
};

export type { VenueCandidatePayload, ParsedCreateUserShowResult };

export async function createUserShow(input: CreateUserShowInput): Promise<ParsedCreateUserShowResult> {
  const { data, error } = await supabase.rpc('create_user_show', {
    p_artist_id: input.artistId,
    p_local_date: input.localDate,
    p_venue_id: input.venueId ?? null,
    p_venue_name: input.venueName ?? null,
    p_venue_city: input.venueCity ?? null,
    p_venue_country: input.venueCountry ?? 'MX',
    p_local_time: input.localTime ?? null,
    p_time_confirmed: input.timeConfirmed ?? true,
    p_confirm_venue_id: input.confirmVenueId ?? null,
    p_force_create_venue: input.forceCreateVenue ?? false,
  });

  if (error) throw error;
  return parseCreateUserShowResponse((data ?? { result: 'unknown' }) as {
    result: string;
    show_id?: string;
    candidates?: VenueCandidatePayload[];
    created_today?: number;
    limit?: number;
  });
}
