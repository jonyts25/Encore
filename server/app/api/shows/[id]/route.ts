import { jsonError, jsonOk } from '@/lib/http';
import { getShowById } from '@/lib/shows';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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
