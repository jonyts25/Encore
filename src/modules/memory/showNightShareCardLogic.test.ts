import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Show } from '@/modules/events/types';

import {
  buildShowNightShareCardModel,
  formatShareCardVenueLine,
  pickShareCardBackgroundUri,
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

  it('prefers video thumbnail over photo', () => {
    const uri = pickShareCardBackgroundUri([
      {
        id: '1',
        user_id: 'u',
        show_id: 's',
        asset_id: 'photo-id',
        media_type: 'photo',
        taken_at: '2026-01-01',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
      {
        id: '2',
        user_id: 'u',
        show_id: 's',
        asset_id: 'video-id',
        media_type: 'video',
        taken_at: '2026-01-01',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
    ]);
    assert.equal(uri, 'ph://video-id');
  });

  it('omits zero song count and empty prediction', () => {
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
    assert.equal(model.prediction, null);
    assert.equal(model.rating, null);
  });

  it('includes highlights and counts when setlist is confirmed', () => {
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
        {
          id: 'ms3',
          memory_id: 'm1',
          song_id: 's3',
          title: 'Viva',
          position: 3,
          is_encore: false,
          is_highlight: true,
        },
      ],
    } satisfies ShowMemory;

    const model = buildShowNightShareCardModel(baseShow(), memory, [], null, 'es');
    assert.equal(model.liveSongCount, 3);
    assert.equal(model.rating, 5);
    assert.deepEqual(model.highlightTitles, ['Yellow', 'Viva']);
  });
});
