import * as SQLite from 'expo-sqlite';

import type { LyricsResult } from '@/modules/lyrics/types';

const DB_NAME = 'encore.db';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedLyricsRecord = LyricsResult;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS lyrics_cache (
          cache_key TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          cached_at INTEGER NOT NULL,
          expires_at INTEGER
        );
      `);
      try {
        await db.execAsync('ALTER TABLE lyrics_cache ADD COLUMN expires_at INTEGER;');
      } catch {
        // Column already exists.
      }
      await db.execAsync(`
        UPDATE lyrics_cache
        SET expires_at = cached_at + ${SEVEN_DAYS_MS}
        WHERE expires_at IS NULL;
      `);
      return db;
    })();
  }
  return dbPromise;
}

function buildCacheKey(artist: string, title: string): string {
  return `${artist.trim().toLowerCase()}::${title.trim().toLowerCase()}`;
}

export function defaultLyricsExpiresAt(now = Date.now()): number {
  return now + SEVEN_DAYS_MS;
}

export function lyricsExpiresAfterShow(showDate: string): number {
  return new Date(showDate).getTime() + SEVEN_DAYS_MS;
}

export async function purgeExpiredLyrics(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM lyrics_cache WHERE expires_at IS NOT NULL AND expires_at < ?', [
    Date.now(),
  ]);
}

export async function getCachedLyrics(
  artist: string,
  title: string
): Promise<CachedLyricsRecord | null> {
  const db = await getDb();
  const cacheKey = buildCacheKey(artist, title);
  const row = await db.getFirstAsync<{ payload_json: string; expires_at: number | null }>(
    'SELECT payload_json, expires_at FROM lyrics_cache WHERE cache_key = ?',
    cacheKey
  );

  if (!row) return null;

  if (row.expires_at != null && row.expires_at < Date.now()) {
    await db.runAsync('DELETE FROM lyrics_cache WHERE cache_key = ?', cacheKey);
    return null;
  }

  return JSON.parse(row.payload_json) as CachedLyricsRecord;
}

export async function setCachedLyrics(
  artist: string,
  title: string,
  record: CachedLyricsRecord,
  options?: { expiresAt?: number }
): Promise<void> {
  const db = await getDb();
  const cacheKey = buildCacheKey(artist, title);
  const now = Date.now();
  const requestedExpires = options?.expiresAt ?? defaultLyricsExpiresAt(now);

  const existing = await db.getFirstAsync<{ expires_at: number | null }>(
    'SELECT expires_at FROM lyrics_cache WHERE cache_key = ?',
    cacheKey
  );

  const expiresAt =
    existing?.expires_at != null ? Math.max(existing.expires_at, requestedExpires) : requestedExpires;

  await db.runAsync(
    'INSERT OR REPLACE INTO lyrics_cache (cache_key, payload_json, cached_at, expires_at) VALUES (?, ?, ?, ?)',
    cacheKey,
    JSON.stringify(record),
    now,
    expiresAt
  );
}
