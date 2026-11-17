import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterSongsByQuery } from './liveSongSearchLogic';
import {
  sortPredictedSongsByPosition,
  sortPredictedSongsForDisplay,
} from '@/modules/setlist/predictionDisplay';
import type { SetlistPrediction } from '@/modules/setlist/types';

function liveSheetPredictedTitles(prediction: SetlistPrediction, searchQuery = ''): string[] {
  const predictedSongs = sortPredictedSongsByPosition(prediction.songs);
  return filterSongsByQuery(predictedSongs, searchQuery).map((song) => song.title);
}

describe('LiveSongsSheet predicted order', () => {
  it('matches sortPredictedSongsForDisplay', () => {
    const prediction: SetlistPrediction = {
      show_id: 'show-1',
      artist_id: 'artist-1',
      tour_id: null,
      sample_size: 3,
      structure: 'mostly_fixed',
      generated_at: '2026-01-01T00:00:00.000Z',
      songs: [
        {
          song_id: 'c',
          title: 'Third',
          confidence: 0.99,
          frequency_pct: 99,
          avg_position: 3,
          is_wildcard: false,
          appeared_in_shows: 3,
          total_shows: 3,
        },
        {
          song_id: 'a',
          title: 'First',
          confidence: 0.5,
          frequency_pct: 50,
          avg_position: 1,
          is_wildcard: false,
          appeared_in_shows: 3,
          total_shows: 3,
        },
        {
          song_id: 'b',
          title: 'Second',
          confidence: 0.9,
          frequency_pct: 90,
          avg_position: 2,
          is_wildcard: false,
          appeared_in_shows: 3,
          total_shows: 3,
        },
      ],
    };

    const expected = sortPredictedSongsForDisplay(prediction).map((song) => song.title);
    assert.deepEqual(liveSheetPredictedTitles(prediction), expected);
    assert.deepEqual(expected, ['First', 'Second', 'Third']);
  });
});