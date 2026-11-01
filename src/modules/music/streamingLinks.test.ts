import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import {
  clearAppleMusicItunesCacheForTests,
  resolveAppleMusicArtistUrl,
  resolveAppleMusicSongUrl,
} from './appleMusicItunes';
import {
  buildAppleMusicSearchUrl,
  buildSetlistSearchQuery,
  buildSongSearchQuery,
  buildSpotifySearchUrl,
  buildYouTubeMusicDeepLink,
  buildYouTubeMusicSearchUrl,
  orderStreamingServices,
} from './streamingLinks';

describe('streamingLinks', () => {
  it('builds search URLs with encoded artist and title', () => {
    assert.equal(
      buildAppleMusicSearchUrl('Radiohead Karma Police'),
      'https://music.apple.com/mx/search?term=Radiohead%20Karma%20Police'
    );
    assert.equal(
      buildSpotifySearchUrl('Radiohead Karma Police'),
      'https://open.spotify.com/search/Radiohead%20Karma%20Police'
    );
    assert.equal(
      buildYouTubeMusicSearchUrl('Radiohead Karma Police'),
      'https://music.youtube.com/search?q=Radiohead%20Karma%20Police'
    );
    assert.equal(
      buildYouTubeMusicDeepLink('Radiohead Karma Police'),
      'youtubemusic://search?q=Radiohead%20Karma%20Police'
    );
  });

  it('builds song and setlist queries', () => {
    assert.equal(buildSongSearchQuery('Radiohead', 'Karma Police'), 'Radiohead Karma Police');
    assert.equal(buildSetlistSearchQuery('Radiohead'), 'Setlist Radiohead');
  });

  it('orders services with preference first', () => {
    assert.deepEqual(orderStreamingServices(null), ['apple_music', 'spotify', 'youtube_music']);
    assert.deepEqual(orderStreamingServices('spotify'), [
      'spotify',
      'apple_music',
      'youtube_music',
    ]);
  });
});

describe('appleMusicItunes', () => {
  afterEach(() => {
    clearAppleMusicItunesCacheForTests();
    mock.restoreAll();
  });

  it('opens trackViewUrl for song search and caches the result', async () => {
    const fetchMock = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [{ trackViewUrl: 'https://music.apple.com/mx/song/123' }],
      }),
    }));
    mock.method(globalThis, 'fetch', fetchMock);

    const url = await resolveAppleMusicSongUrl('Radiohead', 'Karma Police');
    assert.equal(url, 'https://music.apple.com/mx/song/123');
    assert.equal(fetchMock.mock.calls.length, 1);

    const cached = await resolveAppleMusicSongUrl('Radiohead', 'Karma Police');
    assert.equal(cached, url);
    assert.equal(fetchMock.mock.calls.length, 1);
  });

  it('falls back to artistViewUrl when no song match', async () => {
    const fetchMock = mock.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('entity=song')) {
        return {
          ok: true,
          json: async () => ({ resultCount: 0, results: [] }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          resultCount: 1,
          results: [{ artistViewUrl: 'https://music.apple.com/mx/artist/radiohead/123' }],
        }),
      };
    });
    mock.method(globalThis, 'fetch', fetchMock);

    const url = await resolveAppleMusicSongUrl('Radiohead', 'Unknown Track');
    assert.equal(url, 'https://music.apple.com/mx/artist/radiohead/123');
    assert.equal(fetchMock.mock.calls.length, 2);
  });

  it('resolves artist pages for setlist intent', async () => {
    const fetchMock = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [{ artistViewUrl: 'https://music.apple.com/mx/artist/bjork/456' }],
      }),
    }));
    mock.method(globalThis, 'fetch', fetchMock);

    const url = await resolveAppleMusicArtistUrl('Björk');
    assert.equal(url, 'https://music.apple.com/mx/artist/bjork/456');
  });
});
