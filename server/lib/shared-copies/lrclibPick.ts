/** Keep in sync with shared/lrclibPick.ts (app + parity tests). */

/** LRCLIB search record shape (subset used for ranking). */
export type LrclibPickRecord = {
  id: number;
  trackName?: string;
  name?: string;
  artistName?: string;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  duration?: number;
};

export function readLrclibDuration(record: LrclibPickRecord): number | null {
  return typeof record.duration === 'number' && record.duration > 0 ? record.duration : null;
}

/** Prefer synced lyrics, then duration, then first record with plain lyrics. */
export function pickBestLrclibRecord(records: LrclibPickRecord[]): LrclibPickRecord | null {
  const withLyrics = records.filter((record) => Boolean(record.plainLyrics?.trim()));
  if (withLyrics.length === 0) return null;

  return (
    withLyrics.find((record) => Boolean(record.syncedLyrics?.trim())) ??
    withLyrics.find((record) => readLrclibDuration(record) !== null) ??
    withLyrics[0]
  );
}
