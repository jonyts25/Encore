import * as SQLite from 'expo-sqlite';

import type { PracticePackSong } from '@/modules/events/practicePackTypes';
import { legacyPracticeSongsFromTitles } from '@/modules/events/showPackLogic';
import type { Show } from '@/modules/events/types';
import type { SetlistPrediction } from '@/modules/setlist/types';

const DB_NAME = 'encore.db';

export type ShowPackStatus = 'idle' | 'downloading' | 'ready' | 'partial';

export type ShowPackRecord = {
  showId: string;
  status: ShowPackStatus;
  lyricsCached: number;
  lyricsTotal: number;
  lyricsFailed: number;
  downloadedAt: number | null;
  statusUpdatedAt: number;
  expiresAt: number | null;
  show: Show | null;
  prediction: SetlistPrediction | null;
  lyricsMissingTitles: string[];
  practiceSongs: PracticePackSong[];
};

type ShowPackRow = {
  show_id: string;
  status: string;
  lyrics_cached: number;
  lyrics_total: number;
  lyrics_failed: number;
  downloaded_at: number | null;
  status_updated_at: number;
  expires_at: number | null;
  show_json: string | null;
  prediction_json: string | null;
  lyrics_missing_json: string | null;
  practice_titles_json: string | null;
  practice_songs_json: string | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS show_pack (
          show_id TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL,
          lyrics_cached INTEGER NOT NULL,
          lyrics_total INTEGER NOT NULL,
          downloaded_at INTEGER,
          lyrics_failed INTEGER NOT NULL DEFAULT 0,
          status_updated_at INTEGER NOT NULL DEFAULT 0
        );
      `);
      for (const ddl of [
        'ALTER TABLE show_pack ADD COLUMN lyrics_failed INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE show_pack ADD COLUMN status_updated_at INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE show_pack ADD COLUMN expires_at INTEGER;',
        'ALTER TABLE show_pack ADD COLUMN show_json TEXT;',
        'ALTER TABLE show_pack ADD COLUMN prediction_json TEXT;',
        'ALTER TABLE show_pack ADD COLUMN lyrics_missing_json TEXT;',
        'ALTER TABLE show_pack ADD COLUMN practice_titles_json TEXT;',
        'ALTER TABLE show_pack ADD COLUMN practice_songs_json TEXT;',
      ]) {
        try {
          await db.execAsync(ddl);
        } catch {
          // Column already exists.
        }
      }
      await db.execAsync(`
        UPDATE show_pack
        SET status_updated_at = COALESCE(downloaded_at, status_updated_at, 0)
        WHERE status_updated_at = 0;
      `);
      return db;
    })();
  }
  return dbPromise;
}

function parseMissingTitles(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePracticeSongs(
  songsRaw: string | null,
  titlesRaw: string | null
): PracticePackSong[] {
  if (songsRaw) {
    try {
      const parsed = JSON.parse(songsRaw) as PracticePackSong[];
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (entry) =>
            entry &&
            typeof entry.title === 'string' &&
            typeof entry.songId === 'string' &&
            entry.title.trim().length > 0
        );
      }
    } catch {
      // fall through to legacy titles
    }
  }
  return legacyPracticeSongsFromTitles(parseMissingTitles(titlesRaw));
}

function rowToRecord(row: ShowPackRow): ShowPackRecord {
  let show: Show | null = null;
  let prediction: SetlistPrediction | null = null;

  if (row.show_json) {
    try {
      show = JSON.parse(row.show_json) as Show;
    } catch {
      show = null;
    }
  }

  if (row.prediction_json) {
    try {
      prediction = JSON.parse(row.prediction_json) as SetlistPrediction;
    } catch {
      prediction = null;
    }
  }

  return {
    showId: row.show_id,
    status: row.status as ShowPackStatus,
    lyricsCached: row.lyrics_cached,
    lyricsTotal: row.lyrics_total,
    lyricsFailed: row.lyrics_failed,
    downloadedAt: row.downloaded_at,
    statusUpdatedAt: row.status_updated_at,
    expiresAt: row.expires_at,
    show,
    prediction,
    lyricsMissingTitles: parseMissingTitles(row.lyrics_missing_json),
    practiceSongs: parsePracticeSongs(row.practice_songs_json, row.practice_titles_json),
  };
}

export async function purgeExpiredShowPacks(now = Date.now()): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM show_pack WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
}

export async function getShowPackRecord(showId: string): Promise<ShowPackRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ShowPackRow>(
    `SELECT show_id, status, lyrics_cached, lyrics_total, lyrics_failed, downloaded_at,
            status_updated_at, expires_at, show_json, prediction_json, lyrics_missing_json,
            practice_titles_json, practice_songs_json
     FROM show_pack WHERE show_id = ?`,
    showId
  );

  if (!row) return null;

  const record = rowToRecord(row);
  if (record.expiresAt != null && record.expiresAt < Date.now()) {
    await db.runAsync('DELETE FROM show_pack WHERE show_id = ?', showId);
    return null;
  }

  return record;
}

export async function setShowPackRecord(record: ShowPackRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO show_pack (
      show_id, status, lyrics_cached, lyrics_total, lyrics_failed, downloaded_at,
      status_updated_at, expires_at, show_json, prediction_json, lyrics_missing_json,
      practice_titles_json, practice_songs_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.showId,
    record.status,
    record.lyricsCached,
    record.lyricsTotal,
    record.lyricsFailed,
    record.downloadedAt,
    record.statusUpdatedAt,
    record.expiresAt,
    record.show ? JSON.stringify(record.show) : null,
    record.prediction ? JSON.stringify(record.prediction) : null,
    JSON.stringify(record.lyricsMissingTitles),
    JSON.stringify(record.practiceSongs.map((song) => song.title)),
    JSON.stringify(record.practiceSongs)
  );
}

export async function getCachedShowFromPack(showId: string): Promise<Show | null> {
  const record = await getShowPackRecord(showId);
  return record?.show ?? null;
}

export async function getCachedPredictionFromPack(
  showId: string
): Promise<SetlistPrediction | null> {
  const record = await getShowPackRecord(showId);
  return record?.prediction ?? null;
}
