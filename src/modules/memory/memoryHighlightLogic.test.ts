import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyMemorySongHighlight,
  canToggleHighlight,
  memoryToSavePayload,
} from './memoryHighlightLogic';
import type { ShowMemory } from './types';

function baseMemory(): ShowMemory {
  return {
    id: 'm1',
    user_id: 'u1',
    show_id: 'show-1',
    rating: 5,
    note: null,
    setlist_confirmed_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    songs: [
      {
        id: 'ms1',
        memory_id: 'm1',
        song_id: 'A',
        title: 'A',
        position: 1,
        is_encore: false,
        is_highlight: false,
      },
      {
        id: 'ms2',
        memory_id: 'm1',
        song_id: 'B',
        title: 'B',
        position: 2,
        is_encore: false,
        is_highlight: false,
      },
      {
        id: 'ms3',
        memory_id: 'm1',
        song_id: 'C',
        title: 'C',
        position: 3,
        is_encore: false,
        is_highlight: false,
      },
    ],
  };
}

describe('memoryHighlightLogic', () => {
  it('keeps latest highlights when toggling A, B, then C (not the first snapshot)', () => {
    let memory = baseMemory();

    memory = applyMemorySongHighlight(memory, 'A', true);
    memory = applyMemorySongHighlight(memory, 'B', true);
    assert.deepEqual(
      memory.songs.filter((s) => s.is_highlight).map((s) => s.song_id),
      ['A', 'B']
    );

    const payloadAfterAb = memoryToSavePayload(memory);
    assert.deepEqual(
      payloadAfterAb.songs.filter((s) => s.is_highlight).map((s) => s.song_id),
      ['A', 'B']
    );

    memory = applyMemorySongHighlight(memory, 'B', false);
    memory = applyMemorySongHighlight(memory, 'C', true);

    assert.deepEqual(
      memory.songs.filter((s) => s.is_highlight).map((s) => s.song_id),
      ['A', 'C']
    );

    const finalPayload = memoryToSavePayload(memory);
    assert.deepEqual(
      finalPayload.songs.filter((s) => s.is_highlight).map((s) => s.song_id),
      ['A', 'C']
    );
  });

  it('blocks a fourth highlight unless unmarking', () => {
    let memory = baseMemory();
    memory = applyMemorySongHighlight(memory, 'A', true);
    memory = applyMemorySongHighlight(memory, 'B', true);
    memory = applyMemorySongHighlight(memory, 'C', true);
    assert.equal(canToggleHighlight(memory, 'A', false), true);
    assert.equal(canToggleHighlight(memory, 'B', true), true);
    memory = {
      ...memory,
      songs: [
        ...memory.songs,
        {
          id: 'ms4',
          memory_id: 'm1',
          song_id: 'D',
          title: 'D',
          position: 4,
          is_encore: false,
          is_highlight: false,
        },
      ],
    };
    assert.equal(canToggleHighlight(memory, 'D', true), false);
  });
});
