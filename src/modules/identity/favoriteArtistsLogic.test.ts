import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canMarkArtistFavorite,
  compareFollowedArtistRows,
  isFavoriteArtistsLimitError,
  MAX_FAVORITE_ARTISTS,
  sortFollowedArtistRows,
} from './favoriteArtistsLogic';

test('canMarkArtistFavorite allows toggling off and blocks eleventh favorite', () => {
  assert.equal(canMarkArtistFavorite(10, true), true);
  assert.equal(canMarkArtistFavorite(10, false), false);
  assert.equal(canMarkArtistFavorite(9, false), true);
  assert.equal(MAX_FAVORITE_ARTISTS, 10);
});

test('sortFollowedArtistRows puts favorites first by favorited_at desc', () => {
  const sorted = sortFollowedArtistRows([
    {
      is_favorite: false,
      favorited_at: null,
      followed_at: '2026-10-01T00:00:00.000Z',
      id: 'c',
    },
    {
      is_favorite: true,
      favorited_at: '2026-10-02T00:00:00.000Z',
      followed_at: '2026-09-01T00:00:00.000Z',
      id: 'b',
    },
    {
      is_favorite: true,
      favorited_at: '2026-10-03T00:00:00.000Z',
      followed_at: '2026-08-01T00:00:00.000Z',
      id: 'a',
    },
  ]);

  assert.deepEqual(
    sorted.map((row) => row.id),
    ['a', 'b', 'c']
  );
});

test('compareFollowedArtistRows keeps non-favorites by followed_at', () => {
  const newer = {
    is_favorite: false,
    favorited_at: null,
    followed_at: '2026-10-05T00:00:00.000Z',
  };
  const older = {
    is_favorite: false,
    favorited_at: null,
    followed_at: '2026-10-01T00:00:00.000Z',
  };
  assert.ok(compareFollowedArtistRows(newer, older) < 0);
  assert.ok(compareFollowedArtistRows(older, newer) > 0);
});

test('isFavoriteArtistsLimitError detects database limit message', () => {
  assert.equal(isFavoriteArtistsLimitError({ message: 'favorite_artists_limit' }), true);
  assert.equal(isFavoriteArtistsLimitError({ message: 'other' }), false);
});
