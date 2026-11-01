import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Show } from '@/modules/events/types';

import {
  availableShowNightShareTemplates,
  buildShowNightShareCardModel,
  decorativeBarcodeBarWidths,
  formatShareCardPosterDate,
  formatShareCardVenueLine,
} from './showNightShareCardLogic';
import type { ShowMemory } from './types';

function baseShow(): Show {
  return {
    id: 'show-1',
    artist_id: 'a1',
    tour_id: null,
    venue_id: 'v1',
    show_date: '2026-10-30T03:00:00.000Z',
    setlistfm_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    artist: { id: 'a1', name: 'Coldplay', image_url: 'https://example.com/a.jpg', genres: null },
    venue: {
      id: 'v1',
      name: 'Arena Guadalajara',
      city: 'Guadalajara',
      country: 'MX',
      lat: null,
      lng: null,
      capacity: null,
      timezone: 'America/Mexico_City',
    },
  };
}

describe('showNightShareCardLogic', () => {
  it('formats venue line with name, city, and date', () => {
    const line = formatShareCardVenueLine(baseShow(), 'es');
    assert.match(line, /Arena Guadalajara/);
    assert.match(line, /Guadalajara/);
    assert.match(line, /2026/);
  });

  it('formats poster date as dd.MM.yy', () => {
    assert.equal(formatShareCardPosterDate('2026-10-30T03:00:00.000Z'), '30.10.26');
  });

  it('omits zero song count when setlist is confirmed but empty', () => {
    const memory = {
      id: 'm1',
      user_id: 'u1',
      show_id: 'show-1',
      note: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      setlist_confirmed_at: '2026-10-31T00:00:00.000Z',
      rating: null,
      songs: [],
    } satisfies ShowMemory;

    const model = buildShowNightShareCardModel(baseShow(), memory, [], null, 'es');
    assert.equal(model.liveSongCount, null);
    assert.equal(model.rating, null);
    assert.equal(model.hasConfirmedSetlist, false);
  });

  it('includes songs and rating when setlist is confirmed', () => {
    const memory = {
      id: 'm1',
      user_id: 'u1',
      show_id: 'show-1',
      note: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      setlist_confirmed_at: '2026-10-31T00:00:00.000Z',
      rating: 5,
      songs: [
        {
          id: 'ms1',
          memory_id: 'm1',
          song_id: 's1',
          title: 'Yellow',
          position: 1,
          is_encore: false,
          is_highlight: true,
        },
        {
          id: 'ms2',
          memory_id: 'm1',
          song_id: 's2',
          title: 'Fix You',
          position: 2,
          is_encore: false,
          is_highlight: false,
        },
      ],
    } satisfies ShowMemory;

    const model = buildShowNightShareCardModel(baseShow(), memory, [], null, 'es');
    assert.equal(model.liveSongCount, 2);
    assert.equal(model.rating, 5);
    assert.equal(model.confirmedSongs.length, 2);
    assert.equal(model.hasConfirmedSetlist, true);
  });

  it('lists setlist template only when confirmed songs exist', () => {
    const withoutSetlist = buildShowNightShareCardModel(baseShow(), null, [], null, 'es');
    assert.deepEqual(availableShowNightShareTemplates(withoutSetlist), ['boleto', 'poster']);

    const memory = {
      id: 'm1',
      user_id: 'u1',
      show_id: 'show-1',
      note: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      setlist_confirmed_at: '2026-10-31T00:00:00.000Z',
      rating: null,
      songs: [
        {
          id: 'ms1',
          memory_id: 'm1',
          song_id: 's1',
          title: 'Yellow',
          position: 1,
          is_encore: false,
          is_highlight: false,
        },
      ],
    } satisfies ShowMemory;
    const withSetlist = buildShowNightShareCardModel(baseShow(), memory, [], null, 'es');
    assert.deepEqual(availableShowNightShareTemplates(withSetlist), ['boleto', 'setlist', 'poster']);
  });

  it('generates stable barcode widths from show id', () => {
    const a = decorativeBarcodeBarWidths('show-abc');
    const b = decorativeBarcodeBarWidths('show-abc');
    const c = decorativeBarcodeBarWidths('other');
    assert.equal(a.length, 48);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.ok(a.every((w) => w >= 2 && w <= 5));
  });
});
