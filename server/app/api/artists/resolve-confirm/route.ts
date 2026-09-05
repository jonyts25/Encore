import { confirmArtistResolution } from '@/lib/artist-resolve';
import { jsonError, jsonOk } from '@/lib/http';

type ConfirmBody = {
  mbid?: unknown;
};

export async function POST(request: Request) {
  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const mbid = typeof body.mbid === 'string' ? body.mbid.trim() : '';
  if (!mbid) {
    return jsonError('Field "mbid" is required', 400);
  }

  try {
    const artist = await confirmArtistResolution(mbid);
    if (!artist) {
      return jsonError('Artist not found in MusicBrainz', 404);
    }

    return jsonOk({ artist, source: 'resolved' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artist confirmation failed';
    return jsonError(message, 502);
  }
}
