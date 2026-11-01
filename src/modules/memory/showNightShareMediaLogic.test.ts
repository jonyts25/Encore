import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickDefaultShareNightMedia } from './showNightShareMediaLogic';

describe('showNightShareMediaLogic', () => {
  it('prefers first photo by taken_at', () => {
    const pick = pickDefaultShareNightMedia([
      {
        id: '2',
        user_id: 'u',
        show_id: 's',
        asset_id: 'photo-b',
        media_type: 'photo',
        taken_at: '2026-01-02',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
      {
        id: '1',
        user_id: 'u',
        show_id: 's',
        asset_id: 'photo-a',
        media_type: 'photo',
        taken_at: '2026-01-01',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
    ]);
    assert.equal(pick?.assetId, 'photo-a');
    assert.equal(pick?.mediaType, 'photo');
  });

  it('uses median video when no photos exist', () => {
    const pick = pickDefaultShareNightMedia([
      {
        id: '1',
        user_id: 'u',
        show_id: 's',
        asset_id: 'v1',
        media_type: 'video',
        taken_at: '2026-01-01',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
      {
        id: '2',
        user_id: 'u',
        show_id: 's',
        asset_id: 'v2',
        media_type: 'video',
        taken_at: '2026-01-02',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
      {
        id: '3',
        user_id: 'u',
        show_id: 's',
        asset_id: 'v3',
        media_type: 'video',
        taken_at: '2026-01-03',
        song_id: null,
        source: 'library',
        created_at: '2026-01-01',
      },
    ]);
    assert.equal(pick?.assetId, 'v2');
  });
});
