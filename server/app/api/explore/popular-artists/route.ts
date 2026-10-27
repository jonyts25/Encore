import { jsonError, jsonOk } from '@/lib/http';
import { listPopularArtistsByVoy } from '@/lib/explore-popular';

export async function GET() {
  try {
    const artists = await listPopularArtistsByVoy(12);
    return jsonOk({ artists });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load popular artists';
    return jsonError(message, 500, error);
  }
}
