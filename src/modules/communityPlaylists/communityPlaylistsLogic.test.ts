import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sortCommunityPlaylists } from './communityPlaylistsLogic';
import type { CommunityPlaylistRow } from './types';

function row(
  partial: Partial<CommunityPlaylistRow> & Pick<CommunityPlaylistRow, 'id' | 'service' | 'useCount'>
): CommunityPlaylistRow {
  return {
    tour_id: null,
    artist_id: 'a1',
    url: 'https://open.spotify.com/playlist/x',
    title: null,
    created_by: 'u1',
    created_at: '2026-10-01T00:00:00.000Z',
    creator_display_name: null,
    ...partial,
  };
}

describe('sortCommunityPlaylists', () => {
  it('prefers favorite service then use count', () => {
    const sorted = sortCommunityPlaylists(
      [
        row({ id: '1', service: 'apple_music', useCount: 99 }),
        row({ id: '2', service: 'spotify', useCount: 1 }),
        row({ id: '3', service: 'spotify', useCount: 50 }),
      ],
      'spotify'
    );
    assert.deepEqual(sorted.map((item) => item.id), ['3', '2', '1']);
  });
});
