import { jsonError, jsonOk } from '@/lib/http';
import { getLyricsProvider } from '@/lib/providers/lyrics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist')?.trim();
  const title = searchParams.get('title')?.trim();

  if (!artist || !title) {
    return jsonError('Query params "artist" and "title" are required', 400);
  }

  try {
    const provider = getLyricsProvider();
    const matches = await provider.search(artist, title);

    const withLyrics = matches.filter((match) => match.hasPlainLyrics);
    if (withLyrics.length === 0) {
      return jsonError('Lyrics not found', 404, { matches });
    }

    const bestMatch = withLyrics[0];
    const lyrics = await provider.fetch(bestMatch.id);

    return jsonOk({
      lyrics: {
        id: lyrics.id,
        title: lyrics.title,
        artist: lyrics.artist,
        album: lyrics.album,
        plain_lyrics: lyrics.plainLyrics,
        instrumental: lyrics.instrumental,
      },
      attribution: provider.attribution,
      matches: withLyrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lyrics search failed';
    if (message.includes('not found')) {
      return jsonError('Lyrics not found', 404);
    }
    return jsonError(message, 502);
  }
}
