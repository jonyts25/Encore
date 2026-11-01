import { jsonError, jsonOk } from '@/lib/http';
import { resolveSonglinkByAppleUrl } from '@/lib/providers/songlink/songlink';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appleUrl = searchParams.get('appleUrl')?.trim();

  if (!appleUrl) {
    return jsonError('Query param "appleUrl" is required', 400);
  }

  try {
    const links = await resolveSonglinkByAppleUrl(appleUrl);
    return jsonOk({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'song.link lookup failed';
    return jsonError(message, 502, error);
  }
}
