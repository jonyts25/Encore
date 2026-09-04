import { jsonError, jsonOk } from '@/lib/http';
import { getShowById } from '@/lib/shows';

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
    const show = await getShowById(id);
    if (!show) {
      return jsonError('Show not found', 404);
    }
    return jsonOk({ show });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load show';
    return jsonError(message, 500);
  }
}
