import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapAddUserSongRpcError, parseAddUserSongResponse } from '../catalog/addUserSongLogic';
import { normalizeSongTitle } from '../catalog/songTitleNormalize';

import {
  collectShowPackSongTitles,
  isShowPackComplete,
  isShowPackExpired,
  mergePracticeSong,
  mergePracticeTitles,
  showPackExpiresAt,
  SEVEN_DAYS_MS,
} from './showPackLogic';
import { formatShowVenueDateDisplay } from './showVenueTime';

describe('normalizeSongTitle', () => {
  it('lowercases, strips accents, and collapses spaces', () => {
    assert.equal(normalizeSongTitle('  Café   del   Mundo  '), 'cafe del mundo');
    assert.equal(normalizeSongTitle('Niño'), 'nino');
  });

  it('treats accent variants as duplicates', () => {
    assert.equal(normalizeSongTitle('Canción'), normalizeSongTitle('Cancion'));
  });
});

describe('addUserSongLogic', () => {
  it('parses created and existing songs', () => {
    const song = { id: 's1', artist_id: 'a1', title: 'Hit', source: 'user' };
    assert.deepEqual(parseAddUserSongResponse({ result: 'created', song }), {
      ok: true,
      song,
      created: true,
    });
  });

  it('maps auth errors', () => {
    const parsed = mapAddUserSongRpcError('NOT_AUTHENTICATED', '42501');
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.reason, 'not_authenticated');
    }
  });
});

describe('showPackLogic', () => {
  it('expires seven days after show date', () => {
    const showDate = '2026-11-01T21:00:00.000Z';
    const expected = new Date(showDate).getTime() + SEVEN_DAYS_MS;
    assert.equal(showPackExpiresAt(showDate), expected);
  });

  it('detects expired packs', () => {
    assert.equal(isShowPackExpired({ expiresAt: Date.now() - 1 }), true);
    assert.equal(isShowPackExpired({ expiresAt: Date.now() + 60_000 }), false);
  });

  it('marks ready packs without network failures as complete', () => {
    assert.equal(isShowPackComplete({ status: 'ready', lyricsFailed: 0 }), true);
    assert.equal(isShowPackComplete({ status: 'partial', lyricsFailed: 0 }), false);
    assert.equal(isShowPackComplete({ status: 'ready', lyricsFailed: 2 }), false);
  });

  it('merges practice titles without duplicates', () => {
    assert.deepEqual(mergePracticeTitles(['A'], 'B'), ['A', 'B']);
    assert.deepEqual(mergePracticeTitles(['A'], 'A'), ['A']);
  });

  it('merges practice songs by id and normalized title', () => {
    assert.deepEqual(
      mergePracticeSong([{ songId: 'a', title: 'Old' }], { songId: 'a', title: 'New' }),
      [{ songId: 'a', title: 'New' }]
    );
    assert.deepEqual(
      mergePracticeSong([{ songId: '', title: 'Canción' }], { songId: 's1', title: 'Cancion' }),
      [{ songId: 's1', title: 'Cancion' }]
    );
  });

  it('collects prediction and practice titles', () => {
    const titles = collectShowPackSongTitles(
      {
        songs: [{ song_id: '1', title: 'Hit', confidence: 0.9 }],
        others: [{ song_id: '2', title: 'Deep cut', confidence: 0.1 }],
      } as never,
      [{ songId: '3', title: 'Custom' }]
    );
    assert.deepEqual(titles.sort(), ['Custom', 'Deep cut', 'Hit']);
  });

  it('formats venue time without GMT label', () => {
    const display = formatShowVenueDateDisplay(
      {
        show_date: '2026-11-01T03:00:00.000Z',
        venue: { city: 'Monterrey', timezone: 'America/Monterrey' },
      } as never,
      'es',
      (key, options) => {
        if (key === 'events.showVenueTime') {
          return `${options?.time} · hora de ${options?.city}`;
        }
        return key;
      }
    );
    assert.match(display.venueTimeLine ?? '', /hora de Monterrey/);
    assert.doesNotMatch(display.venueTimeLine ?? '', /GMT/i);
  });
});
