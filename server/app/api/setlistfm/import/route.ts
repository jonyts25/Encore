import { requireAuthenticatedUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/http';
import { importSetlistFromUrl } from '@/lib/link-show-setlistfm';

type ImportBody = {
  url?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) {
    return jsonError('Unauthorized', 401);
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return jsonError('Field "url" is required', 400);
  }

  try {
    const result = await importSetlistFromUrl(url);
    return jsonOk({ show_id: result.showId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    if (message === 'invalid_setlist_url') {
      return jsonError('Link de setlist.fm inválido', 400);
    }
    if (message === 'setlist_not_found') {
      return jsonError('Setlist no encontrado en setlist.fm', 404);
    }
    return jsonError(message, 502, error);
  }
}
