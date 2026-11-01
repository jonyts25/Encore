import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getShowNightSearchWindow,
  photosLibraryAssetUri,
  pickPlayableVideoFileUri,
  stripVideoPlaybackUriFragment,
} from './showNightLogic';
import type { Show } from './types';

function baseShow(overrides: Partial<Show> = {}): Show {
  return {
    id: 'show-1',
    artist_id: 'artist-1',
    tour_id: null,
    venue_id: 'venue-1',
    show_date: '2026-06-15T03:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    setlistfm_id: null,
    artist: {
      id: 'artist-1',
      name: 'Artist',
      image_url: null,
      genres: null,
    },
    venue: {
      id: 'venue-1',
      name: 'Arena',
      city: 'CDMX',
      country: 'MX',
      lat: null,
      lng: null,
      capacity: null,
      timezone: 'America/Mexico_City',
    },
    ...overrides,
  };
}

describe('pickPlayableVideoFileUri', () => {
  it('prefers localUri and strips hash fragments', () => {
    assert.equal(
      pickPlayableVideoFileUri('file:///var/video.mov#fragment', 'ph://asset-id'),
      'file:///var/video.mov'
    );
  });

  it('rejects ph:// URIs for playback', () => {
    assert.equal(pickPlayableVideoFileUri(null, 'ph://ABC-DEF'), null);
    assert.equal(pickPlayableVideoFileUri('ph://ABC-DEF', 'file:///ok.mov'), null);
  });

  it('falls back to file uri when localUri is missing', () => {
    assert.equal(
      pickPlayableVideoFileUri(null, 'file:///tmp/export.mov#slowmo'),
      'file:///tmp/export.mov'
    );
  });
});

describe('stripVideoPlaybackUriFragment', () => {
  it('removes trailing hash suffix only', () => {
    assert.equal(stripVideoPlaybackUriFragment('file:///a.mov#foo'), 'file:///a.mov');
    assert.equal(stripVideoPlaybackUriFragment('file:///a.mov'), 'file:///a.mov');
  });
});

describe('photosLibraryAssetUri', () => {
  it('builds ph:// URIs for many assets without async resolution', () => {
    const ids = Array.from({ length: 25 }, (_, index) => `A1B2C3D4-0000-4000-8000-${String(index).padStart(12, '0')}`);
    const uris = ids.map(photosLibraryAssetUri);
    assert.equal(uris.length, 25);
    for (const [index, uri] of uris.entries()) {
      assert.equal(uri, `ph://${ids[index]}`);
    }
  });
});

describe('getShowNightSearchWindow', () => {
  it('uses ±2h / +6h when show time is confirmed', () => {
    const show = baseShow({ show_date: '2026-06-15T03:00:00.000Z' });
    const { createdAfter, createdBefore } = getShowNightSearchWindow(show);
    const center = new Date(show.show_date).getTime();
    assert.equal(createdAfter.getTime(), center - 2 * 60 * 60 * 1000);
    assert.equal(createdBefore.getTime(), center + 6 * 60 * 60 * 1000);
  });

  it('uses full venue local day when time is unconfirmed', () => {
    const show = baseShow({
      show_date: '2026-06-15T12:00:00.000Z',
      local_date: '2026-06-14',
    });
    const { createdAfter, createdBefore } = getShowNightSearchWindow(show);
    assert.ok(createdBefore.getTime() > createdAfter.getTime());
    const spanHours = (createdBefore.getTime() - createdAfter.getTime()) / (60 * 60 * 1000);
    assert.ok(spanHours > 23 && spanHours < 25);
  });
});
