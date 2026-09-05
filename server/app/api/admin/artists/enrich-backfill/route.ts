import { requireAdminRequest } from '@/lib/admin-auth';
import { enrichArtistsNeedingBackfill } from '@/lib/artist-enrich';
import { jsonError, jsonOk } from '@/lib/http';

type BackfillBody = {
  artistIds?: unknown;
  limit?: unknown;
};

export async function POST(request: Request) {
  const adminError = requireAdminRequest(request);
  if (adminError) return adminError;

  let body: BackfillBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as BackfillBody;
    }
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const artistIds = Array.isArray(body.artistIds)
    ? body.artistIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : undefined;
  const limit =
    typeof body.limit === 'number' && body.limit > 0 ? Math.floor(body.limit) : undefined;

  try {
    const result = await enrichArtistsNeedingBackfill({ artistIds, limit });
    return jsonOk({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artist enrich backfill failed';
    return jsonError(message, 500);
  }
}
