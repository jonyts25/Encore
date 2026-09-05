import { requireAuthenticatedUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/http';
import { getHomeShowSections } from '@/lib/shows';

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (!auth) {
      return jsonError('Unauthorized', 401);
    }

    const sections = await getHomeShowSections({
      userId: auth.user.id,
      supabase: auth.supabase,
    });

    return jsonOk({
      going: sections.going,
      interested: sections.interested,
      for_you: sections.forYou,
      attended: sections.attended,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load home show sections';
    return jsonError(message, 500);
  }
}
