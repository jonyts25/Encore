import { listArtistLinks } from '@/lib/artist-links-sync';
import { jsonError, jsonOk } from '@/lib/http';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: artistId } = await context.params;
    const links = await listArtistLinks(artistId);
    return jsonOk({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load artist links';
    return jsonError(message, 500);
  }
}
