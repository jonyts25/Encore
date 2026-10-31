import { requireAuthenticatedUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/http';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { geocodeVenueById } from '@/lib/venue-geocode';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuthenticatedUser(_request);
  if (!auth) {
    return jsonError('Unauthorized', 401);
  }

  const { id: venueId } = await context.params;
  if (!venueId?.trim()) {
    return jsonError('Invalid venue id', 400);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const result = await geocodeVenueById(supabase, venueId.trim(), { force: false });
    return jsonOk({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Venue geocode failed';
    return jsonError(message, 500, error);
  }
}
