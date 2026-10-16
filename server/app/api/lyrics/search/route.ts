import { jsonError, jsonOk } from '@/lib/http';
import { getLyricsProvider, LyricsBusyError, resolveLyricsSearch } from '@/lib/providers/lyrics/lrclib';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist')?.trim();
  const title = searchParams.get('title')?.trim();

  if (!artist || !title) {
    return jsonError('Query params "artist" and "title" are required', 400);
  }

  try {
    const provider = getLyricsProvider();
    const { lyrics, synced, matches } = await resolveLyricsSearch(artist, title);

    return jsonOk({
      lyrics: {
        id: lyrics.id,
        title: lyrics.title,
        artist: lyrics.artist,
        album: lyrics.album,
        plain_lyrics: lyrics.plainLyrics,
        instrumental: lyrics.instrumental,
        duration_seconds: synced?.durationSeconds ?? lyrics.durationSeconds,
        synced_lines: synced?.lines ?? [],
      },
      attribution: provider.attribution,
      matches,
    });
  } catch (error) {
    if (error instanceof LyricsBusyError) {
      return jsonError('lyrics_busy', 503);
    }

    const message = error instanceof Error ? error.message : 'Lyrics search failed';
    if (message.includes('not found')) {
      return jsonError('Lyrics not found', 404);
    }
    return jsonError(message, 502, error);
  }
}
