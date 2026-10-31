import type { PredictedSong } from '@/modules/setlist/types';

import type { SetlistDraftItem } from './types';

export type ShowSongPrefillRow = {
  song_id: string;
  title: string;
  position: number | null;
  is_encore: boolean;
};

export function buildSetlistDraftFromShowSongs(rows: ShowSongPrefillRow[]): SetlistDraftItem[] {
  const sorted = [...rows].sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
  return sorted.map((row, index) => ({
    key: `show-song-${row.song_id}-${index}`,
    songId: row.song_id,
    title: row.title,
    played: true,
    isHighlight: false,
  }));
}

export function buildSetlistDraftFromPrediction(songs: PredictedSong[]): SetlistDraftItem[] {
  return songs.map((song, index) => ({
    key: `pred-${song.song_id}-${index}`,
    songId: song.song_id,
    title: song.title,
    played: true,
    isHighlight: false,
  }));
}

export function resolveSetlistPrefill(
  showSongs: ShowSongPrefillRow[],
  predictedSongs: PredictedSong[]
): SetlistDraftItem[] {
  if (showSongs.length > 0) {
    return buildSetlistDraftFromShowSongs(showSongs);
  }
  if (predictedSongs.length > 0) {
    return buildSetlistDraftFromPrediction(predictedSongs);
  }
  return [];
}

export function countHighlights(items: SetlistDraftItem[]): number {
  return items.filter((item) => item.isHighlight).length;
}

export function toggleHighlight(items: SetlistDraftItem[], key: string, maxHighlights = 3): SetlistDraftItem[] {
  const target = items.find((item) => item.key === key);
  if (!target) return items;
  if (!target.isHighlight && countHighlights(items) >= maxHighlights) {
    return items;
  }
  return items.map((item) =>
    item.key === key ? { ...item, isHighlight: !item.isHighlight } : item
  );
}

export function moveSetlistItem(items: SetlistDraftItem[], key: string, direction: -1 | 1): SetlistDraftItem[] {
  const index = items.findIndex((item) => item.key === key);
  if (index < 0) return items;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [removed] = next.splice(index, 1);
  next.splice(nextIndex, 0, removed);
  return next;
}

export function draftToMemorySongs(
  items: SetlistDraftItem[],
  encoreStartIndex: number | null
): MemorySavePayloadSong[] {
  const played = items.filter((item) => item.played);
  return played.map((item, playedIndex) => {
    const listIndex = items.findIndex((row) => row.key === item.key);
    return {
      song_id: item.songId,
      position: playedIndex + 1,
      is_encore: encoreStartIndex != null && listIndex >= encoreStartIndex,
      is_highlight: item.isHighlight,
    };
  });
}

export type MemorySavePayloadSong = {
  song_id: string;
  position: number;
  is_encore: boolean;
  is_highlight: boolean;
};
