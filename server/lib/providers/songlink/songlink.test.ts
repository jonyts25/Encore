import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSonglinkResponse } from './parseSonglinkResponse';

describe('parseSonglinkResponse', () => {
  it('maps song.link platform URLs', () => {
    const links = parseSonglinkResponse({
      linksByPlatform: {
        youtubeMusic: { url: 'https://music.youtube.com/watch?v=abc' },
        spotify: { url: 'https://open.spotify.com/track/xyz' },
        youtube: { url: 'https://www.youtube.com/watch?v=abc' },
      },
    });
    assert.equal(links.youtubeMusic, 'https://music.youtube.com/watch?v=abc');
    assert.equal(links.spotify, 'https://open.spotify.com/track/xyz');
    assert.equal(links.youtube, 'https://www.youtube.com/watch?v=abc');
  });

  it('returns nulls for missing platforms', () => {
    assert.deepEqual(parseSonglinkResponse({ linksByPlatform: {} }), {
      youtubeMusic: null,
      spotify: null,
      youtube: null,
    });
  });
});
