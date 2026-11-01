import { expiresAtAfterShowDate, SHOW_CACHE_TTL_MS } from '@/core/time/showCacheTtl';

import { normalizeSongTitle } from '@/modules/catalog/songTitleNormalize';
import { medleyPartTitles } from '@/modules/lyrics/medleyParts';
import type { SetlistPrediction } from '@/modules/setlist/types';

import type { Show } from './types';
import { resolveShowLocalDate } from './visibility';
import type { PracticePackSong } from './practicePackTypes';

const MS_PER_HOUR = 60 * 60 * 1000;
export const LYRICS_BUSY_RETRY_DELAYS_MS = [30_000, 120_000, 300_000] as const;
export const SHOW_PACK_STALE_AFTER_MS = 12 * MS_PER_HOUR;
export const SHOW_PACK_ATTENTION_HORIZON_MS = 48 * MS_PER_HOUR;
export const SHOW_PACK_STUCK_DOWNLOADING_MS = 10 * 60 * 1000;

export type ShowPackPrefetchRecord = {
  status: string;
  downloadedAt: number | null;
  statusUpdatedAt: number;
  prediction: SetlistPrediction | null;
  lyricsCached: number;
  lyricsTotal: number;
  lyricsSetlistCached: number;
  lyricsSetlistTotal: number;
  lyricsRotationCached: number;
  lyricsRotationTotal: number;
  lyricsMissingTitles: string[];
  lyricsBusyTitles: string[];
  lyricsFailed: number;
  expiresAt: number | null;
};

export type ShowPackLyricsSegment = 'setlist' | 'rotation' | 'practice';

export type ShowPackLyricsTarget = {
  artist: string;
  title: string;
  segment: ShowPackLyricsSegment;
  isMedley?: boolean;
};

export function addLyricsBusyTitle(titles: readonly string[], title: string): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [...titles];
  if (titles.includes(trimmed)) return [...titles];
  return [...titles, trimmed];
}

export function removeLyricsBusyTitle(titles: readonly string[], title: string): string[] {
  const trimmed = title.trim();
  return titles.filter((entry) => entry !== trimmed);
}

export type ShowPackProgressLabel = {
  key:
    | 'events.showPackSetlistProgress'
    | 'events.showPackSetlistProgressRetrying'
    | 'events.showPackReadyForShow';
  cached: number;
  total: number;
  retrying?: number;
};

export type ShowPackRotationProgressLabel = {
  key: 'events.showPackRotationProgress';
  cached: number;
  total: number;
};

function resolveSetlistCounts(record: {
  lyricsSetlistCached: number;
  lyricsSetlistTotal: number;
  lyricsCached: number;
  lyricsTotal: number;
}): { cached: number; total: number } {
  if (record.lyricsSetlistTotal > 0) {
    return { cached: record.lyricsSetlistCached, total: record.lyricsSetlistTotal };
  }
  return { cached: record.lyricsCached, total: record.lyricsTotal };
}

export function showPackProgressLabel(record: {
  lyricsSetlistCached: number;
  lyricsSetlistTotal: number;
  lyricsCached: number;
  lyricsTotal: number;
  lyricsBusyTitles: readonly string[];
  status: string;
}): ShowPackProgressLabel | null {
  const { cached, total } = resolveSetlistCounts(record);
  if (total <= 0) return null;

  if (record.status === 'ready' && cached >= total) {
    return { key: 'events.showPackReadyForShow', cached, total };
  }

  const retrying = record.lyricsBusyTitles.length;
  if (retrying > 0) {
    return {
      key: 'events.showPackSetlistProgressRetrying',
      cached,
      total,
      retrying,
    };
  }
  return {
    key: 'events.showPackSetlistProgress',
    cached,
    total,
  };
}

export function showPackRotationProgressLabel(record: {
  lyricsRotationCached: number;
  lyricsRotationTotal: number;
}): ShowPackRotationProgressLabel | null {
  if (record.lyricsRotationTotal <= 0) return null;
  return {
    key: 'events.showPackRotationProgress',
    cached: record.lyricsRotationCached,
    total: record.lyricsRotationTotal,
  };
}

export function isShowPackSetlistLyricsComplete(record: {
  lyricsSetlistCached: number;
  lyricsSetlistTotal: number;
  lyricsCached: number;
  lyricsTotal: number;
}): boolean {
  const { cached, total } = resolveSetlistCounts(record);
  return total > 0 && cached >= total;
}

function getZonedHour(show: Pick<Show, 'show_date' | 'local_date' | 'venue'>, now: Date): number {
  const tz = show.venue?.timezone?.trim() || 'America/Mexico_City';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  return Number(formatter.format(now));
}

function addCalendarDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Day before show (venue local) or show-day morning (before noon local). */
export function isShowLyricsScheduleMilestone(
  show: Pick<Show, 'show_date' | 'local_date' | 'venue'>,
  now = new Date()
): boolean {
  const localDate = resolveShowLocalDate(show);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: show.venue?.timezone?.trim() || 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayLocal = formatter.format(now);
  const dayBefore = addCalendarDays(localDate, -1);

  if (todayLocal === dayBefore) return true;
  if (todayLocal === localDate && getZonedHour(show, now) < 12) return true;
  return false;
}

export function isShowWithinLyricsPrefetchSchedule(
  show: Pick<Show, 'show_date' | 'local_date' | 'venue'>,
  now = new Date()
): boolean {
  return isShowWithinPackAttentionWindow(show.show_date, now) || isShowLyricsScheduleMilestone(show, now);
}

export function isShowPackPredictionStale(prediction: SetlistPrediction | null): boolean {
  if (!prediction) return true;
  if (prediction.structure === 'insufficient_data') return true;
  if (prediction.songs.length === 0) return true;
  return false;
}

export function isShowWithinPackAttentionWindow(showDate: string, now = new Date()): boolean {
  const showTime = new Date(showDate).getTime();
  const nowTime = now.getTime();
  if (showTime >= nowTime) {
    return showTime - nowTime <= SHOW_PACK_ATTENTION_HORIZON_MS;
  }
  return nowTime - showTime <= SHOW_PACK_ATTENTION_HORIZON_MS;
}

export function predictionTitleKeys(prediction: SetlistPrediction | null): string[] {
  if (!prediction?.songs.length) return [];
  return [...prediction.songs.map((song) => normalizeSongTitle(song.title))].sort();
}

export function showPackPredictionTitlesMismatch(
  record: Pick<ShowPackPrefetchRecord, 'prediction' | 'status'>,
  currentPrediction: SetlistPrediction | null
): boolean {
  if (record.status !== 'ready') return false;
  const currentKeys = predictionTitleKeys(currentPrediction);
  if (currentKeys.length === 0) return false;
  const packedKeys = predictionTitleKeys(record.prediction);
  if (packedKeys.length === 0) return true;
  if (packedKeys.length !== currentKeys.length) return true;
  return packedKeys.some((key, index) => key !== currentKeys[index]);
}

export function shouldPrefetchShowPackRecord(
  record: ShowPackPrefetchRecord | null,
  showDate: string,
  options?: {
    force?: boolean;
    now?: Date;
    show?: Pick<Show, 'show_date' | 'local_date' | 'venue'>;
    currentPrediction?: SetlistPrediction | null;
  }
): boolean {
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();

  if (options?.force) return true;
  if (!record) return true;
  if (isShowPackExpired(record, nowMs)) return true;
  if (record.status === 'partial') return true;

  if (record.status === 'downloading') {
    return nowMs - record.statusUpdatedAt >= SHOW_PACK_STUCK_DOWNLOADING_MS;
  }

  if (record.status === 'ready') {
    if (record.lyricsMissingTitles.length > 0 || record.lyricsFailed > 0) return true;
    if (
      options?.currentPrediction &&
      showPackPredictionTitlesMismatch(record, options.currentPrediction)
    ) {
      return true;
    }
    if (isShowPackPredictionStale(record.prediction)) return true;

    if (
      isShowWithinPackAttentionWindow(showDate, now) &&
      record.downloadedAt != null &&
      nowMs - record.downloadedAt > SHOW_PACK_STALE_AFTER_MS
    ) {
      return true;
    }

    if (options?.show && isShowLyricsScheduleMilestone(options.show, now)) {
      const incomplete = !isShowPackSetlistLyricsComplete(record);
      if (
        incomplete ||
        record.lyricsBusyTitles.length > 0 ||
        isShowPackPredictionStale(record.prediction)
      ) {
        return true;
      }
      if (record.downloadedAt == null || nowMs - record.downloadedAt > SHOW_PACK_STALE_AFTER_MS) {
        return true;
      }
    }

    return false;
  }

  return true;
}

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
  return buildShowPackLyricsTargets('', prediction, practiceSongs).map((target) => target.title);
}

function titleKey(title: string): string {
  return normalizeSongTitle(title);
}

export function buildShowPackLyricsTargets(
  artistName: string,
  prediction: SetlistPrediction | null,
  practiceSongs: readonly PracticePackSong[]
): ShowPackLyricsTarget[] {
  const targets: ShowPackLyricsTarget[] = [];
  const seen = new Set<string>();

  const pushTarget = (
    title: string,
    segment: ShowPackLyricsSegment,
    isMedley?: boolean
  ): void => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const key = titleKey(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    targets.push({
      artist: artistName,
      title: trimmed,
      segment,
      isMedley,
    });
  };

  for (const song of prediction?.songs ?? []) {
    pushTarget(song.title, 'setlist', song.is_medley);
  }
  for (const other of prediction?.others ?? []) {
    pushTarget(other.title, 'rotation');
  }
  for (const song of practiceSongs) {
    pushTarget(song.title, 'practice');
  }

  return targets;
}

export function showPackSegmentTotals(
  prediction: SetlistPrediction | null,
  practiceSongs: readonly PracticePackSong[]
): { setlist: number; rotation: number; practice: number; all: number } {
  const targets = buildShowPackLyricsTargets('', prediction, practiceSongs);
  let setlist = 0;
  let rotation = 0;
  let practice = 0;
  for (const target of targets) {
    if (target.segment === 'setlist') setlist += 1;
    else if (target.segment === 'rotation') rotation += 1;
    else practice += 1;
  }
  return { setlist, rotation, practice, all: targets.length };
}

/** Medley parts that must be cached for the pack unit to count as ready. */
export function showPackLyricsPartTitles(target: Pick<ShowPackLyricsTarget, 'title' | 'isMedley'>): string[] {
  return medleyPartTitles(target.title, target.isMedley);
}

export { SHOW_CACHE_TTL_MS as SEVEN_DAYS_MS };
