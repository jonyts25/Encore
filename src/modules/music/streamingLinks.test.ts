import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAppleMusicSearchUrl,
  buildSetlistSearchQuery,
  buildSongSearchQuery,
  buildSpotifySearchUrl,
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
