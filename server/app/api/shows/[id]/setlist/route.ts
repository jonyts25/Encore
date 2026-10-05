import { jsonError, jsonOk } from '@/lib/http';
import { getShowSetlist } from '@/lib/setlist-prediction';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return jsonError('Show not found', 404);
  }

  try {
    const songs = await getShowSetlist(id);
    if (songs === null) {
      return jsonError('Show not found', 404);
    }

    return jsonOk({ show_id: id, songs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load setlist';
    return jsonError(message, 500);
  }
}
