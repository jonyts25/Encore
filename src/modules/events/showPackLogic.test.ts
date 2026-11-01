import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapAddUserSongRpcError, parseAddUserSongResponse } from '../catalog/addUserSongLogic';
import { normalizeSongTitle } from '../catalog/songTitleNormalize';

import {
  addLyricsBusyTitle,
  buildShowPackLyricsTargets,
  collectShowPackSongTitles,
  predictionTitleKeys,
  showPackPredictionTitlesMismatch,
  isShowPackComplete,
  isShowPackExpired,
  isShowPackSetlistLyricsComplete,
  mergePracticeSong,
  mergePracticeTitles,
  removeLyricsBusyTitle,
  shouldPrefetchShowPackRecord,
  showPackExpiresAt,
  showPackProgressLabel,
  showPackSegmentTotals,
  showPackLyricsPartTitles,
  SHOW_PACK_STALE_AFTER_MS,
  SEVEN_DAYS_MS,
} from './showPackLogic';
import { formatShowCardMetaLine } from './showVenueTime';
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

  it('prefetches ready pack when prediction is empty or insufficient_data', () => {
    const showDate = '2026-10-31T03:00:00.000Z';
    const now = new Date('2026-10-30T00:00:00.000Z');
    const base = {
      status: 'ready',
      downloadedAt: now.getTime() - 60_000,
      statusUpdatedAt: now.getTime(),
      lyricsCached: 10,
      lyricsTotal: 10,
      lyricsSetlistCached: 10,
      lyricsSetlistTotal: 10,
      lyricsRotationCached: 0,
      lyricsRotationTotal: 0,
      lyricsMissingTitles: [] as string[],
      lyricsBusyTitles: [] as string[],
      lyricsFailed: 0,
      expiresAt: now.getTime() + 1_000_000,
    };

    assert.equal(
      shouldPrefetchShowPackRecord({ ...base, prediction: null }, showDate, { now }),
      true
    );
    assert.equal(
      shouldPrefetchShowPackRecord(
        {
          ...base,
          prediction: {
            structure: 'insufficient_data',
            songs: [],
          } as never,
        },
        showDate,
        { now }
      ),
      true
    );
  });

  it('skips prefetch for fresh ready pack with useful prediction', () => {
    const showDate = '2026-10-31T03:00:00.000Z';
    const now = new Date('2026-10-30T00:00:00.000Z');
    assert.equal(
      shouldPrefetchShowPackRecord(
        {
          status: 'ready',
          downloadedAt: now.getTime() - 60_000,
          statusUpdatedAt: now.getTime(),
          lyricsCached: 1,
          lyricsTotal: 1,
          lyricsSetlistCached: 1,
          lyricsSetlistTotal: 1,
          lyricsRotationCached: 0,
          lyricsRotationTotal: 0,
          lyricsMissingTitles: [],
          lyricsBusyTitles: [],
          lyricsFailed: 0,
          expiresAt: now.getTime() + 1_000_000,
          prediction: {
            structure: 'single_show_reference',
            songs: [{ song_id: '1', title: 'Song' }],
          } as never,
        },
        showDate,
        { now }
      ),
      false
    );
  });

  it('prefetches stale ready pack within 48h of show', () => {
    const showDate = '2026-10-31T03:00:00.000Z';
    const now = new Date('2026-10-30T18:00:00.000Z');
    assert.equal(
      shouldPrefetchShowPackRecord(
        {
          status: 'ready',
          downloadedAt: now.getTime() - SHOW_PACK_STALE_AFTER_MS - 1,
          statusUpdatedAt: now.getTime(),
          lyricsCached: 1,
          lyricsTotal: 1,
          lyricsSetlistCached: 1,
          lyricsSetlistTotal: 1,
          lyricsRotationCached: 0,
          lyricsRotationTotal: 0,
          lyricsMissingTitles: [],
          lyricsBusyTitles: [],
          lyricsFailed: 0,
          expiresAt: now.getTime() + 1_000_000,
          prediction: {
            structure: 'single_show_reference',
            songs: [{ song_id: '1', title: 'Song' }],
          } as never,
        },
        showDate,
        { now }
      ),
      true
    );
  });

  it('detects prediction title mismatch on ready pack', () => {
    const record = {
      status: 'ready' as const,
      prediction: {
        structure: 'mostly_fixed' as const,
        songs: [{ song_id: '1', title: 'Old Song' }],
      } as never,
    };
    const current = {
      structure: 'mostly_fixed' as const,
      songs: [
        { song_id: '1', title: 'Old Song' },
        { song_id: '2', title: 'New Song' },
      ],
    } as never;
    assert.equal(showPackPredictionTitlesMismatch(record, current), true);
    const sameTitles = {
      structure: 'mostly_fixed' as const,
      songs: [{ song_id: '1', title: 'Old Song' }],
    } as never;
    assert.equal(showPackPredictionTitlesMismatch(record, sameTitles), false);
    assert.deepEqual(predictionTitleKeys(current), ['new song', 'old song']);
  });

  it('tracks busy titles separately from failed lyrics', () => {
    assert.deepEqual(addLyricsBusyTitle(['A'], 'B'), ['A', 'B']);
    assert.deepEqual(addLyricsBusyTitle(['A'], 'A'), ['A']);
    assert.deepEqual(removeLyricsBusyTitle(['A', 'B'], 'A'), ['B']);
  });

  it('builds setlist progress label with retrying count', () => {
    assert.deepEqual(
      showPackProgressLabel({
        status: 'downloading',
        lyricsSetlistCached: 20,
        lyricsSetlistTotal: 29,
        lyricsCached: 28,
        lyricsTotal: 41,
        lyricsBusyTitles: ['a'],
      }),
      {
        key: 'events.showPackSetlistProgressRetrying',
        cached: 20,
        total: 29,
        retrying: 1,
      }
    );
    assert.deepEqual(
      showPackProgressLabel({
        status: 'ready',
        lyricsSetlistCached: 29,
        lyricsSetlistTotal: 29,
        lyricsCached: 30,
        lyricsTotal: 41,
        lyricsBusyTitles: [],
      }),
      {
        key: 'events.showPackReadyForShow',
        cached: 29,
        total: 29,
      }
    );
  });

  it('orders pack targets setlist, rotation, then practice', () => {
    const targets = buildShowPackLyricsTargets(
      'Artist',
      {
        songs: [
          { song_id: '1', title: 'Main A' },
          { song_id: '2', title: 'Part A / Part B', is_medley: true },
        ],
        others: [{ song_id: '3', title: 'Rotation', frequency: 1, frequency_pct: 40 }],
      } as never,
      [{ songId: '4', title: 'Practice' }]
    );
    assert.deepEqual(
      targets.map((target) => [target.segment, target.title]),
      [
        ['setlist', 'Main A'],
        ['setlist', 'Part A / Part B'],
        ['rotation', 'Rotation'],
        ['practice', 'Practice'],
      ]
    );
    assert.deepEqual(showPackLyricsPartTitles(targets[1]!), ['Part A', 'Part B']);
  });

  it('counts setlist and rotation separately', () => {
    const totals = showPackSegmentTotals(
      {
        songs: [{ song_id: '1', title: 'A' }],
        others: [
          { song_id: '2', title: 'R1', frequency: 1, frequency_pct: 10 },
          { song_id: '3', title: 'R2', frequency: 1, frequency_pct: 20 },
        ],
      } as never,
      []
    );
    assert.equal(totals.setlist, 1);
    assert.equal(totals.rotation, 2);
    assert.equal(totals.all, 3);
  });

  it('considers setlist complete even when rotation is pending', () => {
    assert.equal(
      isShowPackSetlistLyricsComplete({
        lyricsSetlistCached: 29,
        lyricsSetlistTotal: 29,
        lyricsCached: 30,
        lyricsTotal: 41,
      }),
      true
    );
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

  it('collects prediction and practice titles in priority order', () => {
    const titles = collectShowPackSongTitles(
      {
        songs: [{ song_id: '1', title: 'Hit', confidence: 0.9 }],
        others: [{ song_id: '2', title: 'Deep cut', frequency: 1, frequency_pct: 10 }],
      } as never,
      [{ songId: '3', title: 'Custom' }]
    );
    assert.deepEqual(titles, ['Hit', 'Deep cut', 'Custom']);
  });

  it('formats show card meta without GMT label', () => {
    const line = formatShowCardMetaLine(
      {
        show_date: '2026-10-29T03:00:00.000Z',
        venue: { name: 'Arena Guadalajara', city: 'Guadalajara', timezone: 'America/Mexico_City' },
      } as never,
      'es',
      (key) => (key === 'events.timeUnconfirmed' ? 'Hora por confirmar' : key)
    );
    assert.match(line, /Arena Guadalajara/);
    assert.doesNotMatch(line, /GMT/i);
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
