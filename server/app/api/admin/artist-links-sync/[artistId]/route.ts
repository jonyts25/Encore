import { requireAdminRequest } from '@/lib/admin-auth';
import { syncArtistLinksFromMusicBrainz } from '@/lib/artist-links-sync';
import { jsonError, jsonOk } from '@/lib/http';

type RouteContext = {
  params: Promise<{ artistId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const adminError = requireAdminRequest(request);
  if (adminError) return adminError;

  try {
    const { artistId } = await context.params;
    const result = await syncArtistLinksFromMusicBrainz(artistId);
    return jsonOk({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync artist links';
    return jsonError(message, 500);
  }
}
