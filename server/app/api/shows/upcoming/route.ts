import { requireAuthenticatedUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/http';
import { listUpcomingShows } from '@/lib/shows';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const followedOnly = searchParams.get('followed') === 'true';

    if (followedOnly) {
      const auth = await requireAuthenticatedUser(request);
      if (!auth) {
        return jsonError('Unauthorized', 401);
      }

      const shows = await listUpcomingShows({
        followedOnly: true,
        supabase: auth.supabase,
        userId: auth.user.id,
      });
      return jsonOk({ shows });
    }

    const shows = await listUpcomingShows();
    return jsonOk({ shows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load upcoming shows';
    return jsonError(message, 500);
  }
}
