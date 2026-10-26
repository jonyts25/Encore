import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectPackSongTitles,
  filterSongsByQuery,
  isRepertoireSegmentAvailable,
  matchesSongSearch,
  mergeUniqueTitles,
  pickSearchScope,
  repertoireTitlesFromCatalog,
  shouldFetchRemoteLyricsSearch,
} from './liveSongSearchLogic';

describe('liveSongSearchLogic', () => {
  it('matches titles by substring', () => {
    assert.equal(matchesSongSearch('Bohemian Rhapsody', 'rhaps'), true);
    assert.equal(matchesSongSearch('Bohemian Rhapsody', 'zz'), false);
  });

  it('collects pack titles without duplicates', () => {
    const titles = collectPackSongTitles(
      [{ title: 'A' }, { title: 'B' }],
      [{ title: 'B' }, { title: 'C' }]
    );
    assert.deepEqual(titles.sort(), ['A', 'B', 'C']);
  });

  it('filters predicted songs offline', () => {
    const filtered = filterSongsByQuery(
      [
        { title: 'Song One', song_id: '1' },
        { title: 'Another', song_id: '2' },
      ],
      'one'
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.title, 'Song One');
  });

  it('gates repertoire when offline', () => {
    assert.equal(isRepertoireSegmentAvailable(true), false);
    assert.equal(isRepertoireSegmentAvailable(false), true);
    assert.equal(pickSearchScope({ segment: 'all', isOffline: true }), 'predicted');
    assert.equal(pickSearchScope({ segment: 'all', isOffline: false }), 'all');
  });

  it('fetches remote lyrics search only when catalog has no matches', () => {
    assert.equal(shouldFetchRemoteLyricsSearch(false, 'hello', 0), true);
    assert.equal(shouldFetchRemoteLyricsSearch(false, 'hello', 2), false);
    assert.equal(shouldFetchRemoteLyricsSearch(true, 'hello', 0), false);
    assert.equal(shouldFetchRemoteLyricsSearch(false, '', 0), false);
  });

  it('merges catalog titles for online search', () => {
    const pack = collectPackSongTitles([{ title: 'A' }], [{ title: 'B' }]);
    const rep = repertoireTitlesFromCatalog([
      { id: '1', title: 'B' },
      { id: '2', title: 'C' },
    ]);
    assert.deepEqual(mergeUniqueTitles(pack, rep), ['A', 'B', 'C']);
  });
});
