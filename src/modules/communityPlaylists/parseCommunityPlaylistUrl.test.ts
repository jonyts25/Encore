import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE,
  parseCommunityPlaylistUrl,
} from './parseCommunityPlaylistUrl';

describe('parseCommunityPlaylistUrl', () => {
  it('accepts Apple Music playlist links and strips tracking params', () => {
    const result = parseCommunityPlaylistUrl(
      'https://music.apple.com/mx/playlist/pl-name/pl.u-abc123?si=xyz&utm_source=share'
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.service, 'apple_music');
      assert.equal(result.value.url.includes('si='), false);
      assert.equal(result.value.url.includes('utm_'), false);
      assert.match(result.value.url, /music\.apple\.com.*\/playlist\//);
    }
  });

  it('accepts Spotify playlist links', () => {
    const result = parseCommunityPlaylistUrl(
      'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWTAQ5?utm_medium=share'
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.service, 'spotify');
      assert.equal(result.value.url, 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWTAQ5');
    }
  });

  it('accepts YouTube Music and youtube.com playlist links as youtube_music', () => {
    const music = parseCommunityPlaylistUrl(
      'https://music.youtube.com/playlist?list=PLabc123&si=token'
    );
    assert.equal(music.ok, true);
    if (music.ok) {
      assert.equal(music.value.service, 'youtube_music');
      assert.equal(music.value.url.includes('si='), false);
    }

    const www = parseCommunityPlaylistUrl('https://www.youtube.com/playlist?list=PLxyz');
    assert.equal(www.ok, true);
    if (www.ok) {
      assert.equal(www.value.service, 'youtube_music');
    }
  });

  it('rejects other domains with the expected message', () => {
    const result = parseCommunityPlaylistUrl('https://example.com/playlist/123');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.message, COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE);
    }
  });

  it('rejects valid domains without playlist paths', () => {
    assert.equal(parseCommunityPlaylistUrl('https://open.spotify.com/track/abc').ok, false);
    assert.equal(parseCommunityPlaylistUrl('https://music.apple.com/mx/album/x/123').ok, false);
    assert.equal(parseCommunityPlaylistUrl('https://youtube.com/watch?v=abc').ok, false);
  });
});
