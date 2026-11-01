import { requireAuthenticatedUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/http';
import { linkSetlistUrlToShow } from '@/lib/link-show-setlistfm';
import { getShowById } from '@/lib/shows';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LinkBody = {
  url?: unknown;
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

  let body: LinkBody;
  try {
    body = (await request.json()) as LinkBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return jsonError('Field "url" is required', 400);
  }

  try {
    const show = await getShowById(showId);
    if (!show) {
      return jsonError('Show not found', 404);
    }

    const result = await linkSetlistUrlToShow(showId, url);
    return jsonOk({ show_id: result.showId, songs_inserted: result.songsInserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Link failed';
    if (message === 'invalid_setlist_url') {
      return jsonError('Link de setlist.fm inválido', 400);
    }
    if (message === 'setlist_not_found') {
      return jsonError('Setlist no encontrado en setlist.fm', 404);
    }
    if (message === 'setlist_date_mismatch') {
      return jsonError('Ese setlist es de otra fecha', 400);
    }
    if (message === 'setlist_artist_mismatch') {
      return jsonError('Ese setlist es de otro artista', 400);
    }
    return jsonError(message, 502, error);
  }
}
