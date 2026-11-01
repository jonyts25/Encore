import type { ShowMemory } from './types';

export function countMemoryHighlights(memory: ShowMemory): number {
  return memory.songs.filter((song) => song.is_highlight).length;
}

export function canToggleHighlight(memory: ShowMemory, songId: string, nextHighlight: boolean): boolean {
  if (!nextHighlight) return true;
  if (countMemoryHighlights(memory) >= 3) {
    const target = memory.songs.find((song) => song.song_id === songId);
    if (target?.is_highlight) return true;
    return false;
  }
  return true;
}

/** Applies one highlight toggle to an in-memory snapshot (for cache + offline queue). */
export function applyMemorySongHighlight(
  memory: ShowMemory,
  songId: string,
  isHighlight: boolean
): ShowMemory {
  return {
    ...memory,
    songs: memory.songs.map((song) =>
      song.song_id === songId ? { ...song, is_highlight: isHighlight } : song
    ),
  };
}

export function memoryToSavePayload(memory: ShowMemory) {
  return {
    show_id: memory.show_id,
    rating: memory.rating,
    note: memory.note,
    setlist_confirmed_at: memory.setlist_confirmed_at,
    songs: memory.songs.map((song) => ({
      song_id: song.song_id,
      position: song.position,
      is_encore: song.is_encore,
      is_highlight: song.is_highlight,
    })),
  };
}
