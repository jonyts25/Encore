import { searchArtistsWithResolution } from '@/lib/artist-resolve';
import { jsonError, jsonOk } from '@/lib/http';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return jsonError('Query param "q" is required', 400);
  }

  try {
    const result = await searchArtistsWithResolution(query);
    return jsonOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artist search failed';
    return jsonError(message, 502);
  }
}
