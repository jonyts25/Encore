import { expiresAtAfterShowDate, SHOW_CACHE_TTL_MS } from '@/core/time/showCacheTtl';

import { normalizeSongTitle } from '@/modules/catalog/songTitleNormalize';
import type { SetlistPrediction } from '@/modules/setlist/types';

import type { PracticePackSong } from './practicePackTypes';

export function showPackExpiresAt(showDate: string): number {
  return expiresAtAfterShowDate(showDate);
}

export function isShowPackExpired(
  record: { expiresAt: number | null },
  now = Date.now()
): boolean {
  if (record.expiresAt == null) return false;
  return record.expiresAt < now;
}

export function isShowPackComplete(record: {
  status: string;
  lyricsFailed: number;
}): boolean {
  return record.status === 'ready' && record.lyricsFailed === 0;
}

export function showPackExpiryFromShowDate(showDate: string, now = Date.now()): number {
  const expires = showPackExpiresAt(showDate);
  return expires - now;
}

export function mergePracticeTitles(existing: readonly string[], title: string): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [...existing];
  if (existing.some((entry) => entry === trimmed)) return [...existing];
  return [...existing, trimmed];
}

export function mergePracticeSong(
  existing: readonly PracticePackSong[],
  entry: PracticePackSong
): PracticePackSong[] {
  const trimmedTitle = entry.title.trim();
  const songId = entry.songId.trim();
  if (!trimmedTitle || !songId) return [...existing];

  const normalized = normalizeSongTitle(trimmedTitle);
  let replaced = false;
  const next = existing.map((song) => {
    const sameId = song.songId === songId;
    const sameTitle = normalizeSongTitle(song.title) === normalized;
    if (sameId || sameTitle) {
      replaced = true;
      return { songId, title: trimmedTitle };
    }
    return song;
  });

  if (replaced) return next;
  return [...existing, { songId, title: trimmedTitle }];
}

export function practiceTitlesFromSongs(songs: readonly PracticePackSong[]): string[] {
  return songs.map((song) => song.title);
}

export function legacyPracticeSongsFromTitles(titles: readonly string[]): PracticePackSong[] {
  return titles.map((title) => ({ songId: '', title }));
}

export function collectShowPackSongTitles(
  prediction: SetlistPrediction | null,
  practiceSongs: readonly PracticePackSong[]
): string[] {
  const titles = new Set<string>();
  for (const song of prediction?.songs ?? []) {
    titles.add(song.title);
  }
  for (const other of prediction?.others ?? []) {
    titles.add(other.title);
  }
  for (const song of practiceSongs) {
    titles.add(song.title);
  }
  return [...titles];
}

export { SHOW_CACHE_TTL_MS as SEVEN_DAYS_MS };
