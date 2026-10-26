import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectShowPackSongTitles,
  isShowPackComplete,
  isShowPackExpired,
  mergePracticeTitles,
  showPackExpiresAt,
  SEVEN_DAYS_MS,
} from './showPackLogic';
import { formatShowVenueDateDisplay } from './showVenueTime';

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

  it('collects prediction and practice titles', () => {
    const titles = collectShowPackSongTitles(
      {
        songs: [{ song_id: '1', title: 'Hit', confidence: 0.9 }],
        others: [{ song_id: '2', title: 'Deep cut', confidence: 0.1 }],
      } as never,
      ['Custom']
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
