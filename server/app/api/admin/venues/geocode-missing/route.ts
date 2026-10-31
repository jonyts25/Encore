import { requireAdminRequest } from '@/lib/admin-auth';
import { jsonError, jsonOk } from '@/lib/http';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { geocodeMissingVenues } from '@/lib/venue-geocode';

export async function POST(request: Request) {
  const adminError = requireAdminRequest(request);
  if (adminError) return adminError;

  const url = new URL(request.url);
  const forceVenueId = url.searchParams.get('venueId')?.trim() || undefined;
  const force = url.searchParams.get('force') === '1';

  try {
    const supabase = createSupabaseAdminClient();
    const summary = await geocodeMissingVenues(supabase, {
      forceVenueId,
      force: forceVenueId ? force : false,
    });
    return jsonOk({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Venue geocode backfill failed';
    return jsonError(message, 500, error);
  }
}
