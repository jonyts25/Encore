import { expiresAtAfterShowDate, SHOW_CACHE_TTL_MS } from '@/core/time/showCacheTtl';

import type { SetlistPrediction } from '@/modules/setlist/types';

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

export function collectShowPackSongTitles(
  prediction: SetlistPrediction | null,
  practiceTitles: readonly string[]
): string[] {
  const titles = new Set<string>();
  for (const song of prediction?.songs ?? []) {
    titles.add(song.title);
  }
  for (const other of prediction?.others ?? []) {
    titles.add(other.title);
  }
  for (const title of practiceTitles) {
    titles.add(title);
  }
  return [...titles];
}

export { SHOW_CACHE_TTL_MS as SEVEN_DAYS_MS };
