import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isStaleRequest,
  mergeArtistLists,
  shouldAutoFetchRemote,
  shouldOfferWorldwideSearch,
} from './artistCatalogSearchLogic';
import type { Artist } from './types';

function artist(id: string, name: string): Artist {
  return {
    id,
    mbid: null,
    name,
    image_url: null,
    genres: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('shouldAutoFetchRemote', () => {
  it('fetches remote when there are no local matches', () => {
    assert.equal(shouldAutoFetchRemote(0, false), true);
  });

  it('skips remote when locals exist unless forced', () => {
    assert.equal(shouldAutoFetchRemote(2, false), false);
    assert.equal(shouldAutoFetchRemote(2, true), true);
  });
});

describe('shouldOfferWorldwideSearch', () => {
  it('offers worldwide when locals exist and remote was not tried', () => {
    assert.equal(shouldOfferWorldwideSearch('natalia', 3, false, false), true);
  });

  it('hides worldwide while resolving or after remote fetch', () => {
    assert.equal(shouldOfferWorldwideSearch('natalia', 3, false, true), false);
    assert.equal(shouldOfferWorldwideSearch('natalia', 3, true, false), false);
    assert.equal(shouldOfferWorldwideSearch('', 3, false, false), false);
  });
});

describe('mergeArtistLists', () => {
  it('dedupes by id with locals first', () => {
    const merged = mergeArtistLists(
      [artist('a1', 'Local')],
      [artist('a1', 'Remote dup'), artist('a2', 'Remote')]
    );
    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.name, 'Local');
    assert.equal(merged[1]?.id, 'a2');
  });
});

describe('isStaleRequest', () => {
  it('detects outdated generations', () => {
    assert.equal(isStaleRequest(1, 2), true);
    assert.equal(isStaleRequest(2, 2), false);
  });
});
