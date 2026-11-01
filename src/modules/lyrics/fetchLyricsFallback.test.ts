import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiError } from '@/core/api/client';

import { shouldTryDirectLrclibFallback, tryDirectLrclibFallback } from './fetchLyricsFallback';
import type { LyricsSearchResponse } from './types';

describe('fetchLyricsFallback', () => {
  it('detects lyrics_busy, timeout, and abort errors', () => {
    assert.equal(
      shouldTryDirectLrclibFallback(new ApiError('busy', 503, { error: 'lyrics_busy' })),
      true
    );
    assert.equal(shouldTryDirectLrclibFallback(new ApiError('timeout', 408)), true);
    assert.equal(
      shouldTryDirectLrclibFallback(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      true
    );
    assert.equal(shouldTryDirectLrclibFallback(new ApiError('other', 502)), false);
  });

  it('returns lyrics when direct LRCLIB succeeds after server busy', async () => {
    const cached: LyricsSearchResponse = {
      lyrics: {
        id: '7',
        title: 'Song',
        artist: 'Artist',
        album: null,
        plain_lyrics: 'Line',
        instrumental: false,
        duration_seconds: 180,
        synced_lines: [],
      },
      attribution: 'LRCLIB',
    };

    const result = await tryDirectLrclibFallback('Artist', 'Song', {
      mapResponse: (data) => ({
        id: data.lyrics.id,
        title: data.lyrics.title,
        artist: data.lyrics.artist,
        album: data.lyrics.album,
        plainLyrics: data.lyrics.plain_lyrics,
        instrumental: data.lyrics.instrumental,
        attribution: data.attribution,
        durationSeconds: data.lyrics.duration_seconds,
        syncedLines: data.lyrics.synced_lines,
        scrollMode: 'estimated',
      }),
      setCached: async () => {},
      fetchDirect: async () => cached,
    });

    assert.equal(result?.plainLyrics, 'Line');
  });

  it('returns undefined when direct LRCLIB fails so caller can throw busy', async () => {
    const result = await tryDirectLrclibFallback('Artist', 'Song', {
      mapResponse: () => {
        throw new Error('unused');
      },
      setCached: async () => {},
      fetchDirect: async () => {
        throw new Error('503');
      },
    });

    assert.equal(result, undefined);
  });
});
