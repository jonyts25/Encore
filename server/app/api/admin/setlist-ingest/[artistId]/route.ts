import { requireAdminRequest } from '@/lib/admin-auth';
import { jsonError, jsonOk } from '@/lib/http';
import { ingestArtistSetlists } from '@/lib/setlist-ingest';

type RouteContext = {
  params: Promise<{ artistId: string }>;
};

type IngestBody = {
  pages?: unknown;
  maxSetlists?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const adminError = requireAdminRequest(request);
  if (adminError) return adminError;

  const { artistId } = await context.params;

  let body: IngestBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as IngestBody;
    }
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const pages = typeof body.pages === 'number' && body.pages > 0 ? Math.floor(body.pages) : 3;
  const maxSetlists =
    typeof body.maxSetlists === 'number' && body.maxSetlists > 0
      ? Math.floor(body.maxSetlists)
      : 30;

  try {
    const result = await ingestArtistSetlists(artistId, { pages, maxSetlists });
    return jsonOk({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Setlist ingest failed';
    return jsonError(message, 500);
  }
}
