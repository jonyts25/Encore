import { jsonError, jsonOk } from '@/lib/http';
import { requireAuthenticatedUser } from '@/lib/auth';
import { enrichShow } from '@/lib/enrich-show';
import { getShowById } from '@/lib/shows';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) {
    return jsonError('Unauthorized', 401);
  }

  const { id: showId } = await context.params;
  if (!UUID_RE.test(showId)) {
    return jsonError('Show not found', 404);
  }

  try {
    const show = await getShowById(showId);
    if (!show) {
      return jsonError('Show not found', 404);
    }

    const result = await enrichShow(showId);
    return jsonOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enrich show';
    return jsonError(message, 500, error);
  }
}
