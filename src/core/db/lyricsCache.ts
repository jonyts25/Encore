import * as SQLite from 'expo-sqlite';

import type { LyricsResult } from '@/modules/lyrics/types';

const DB_NAME = 'encore.db';
const LYRICS_TTL_MS = 24 * 60 * 60 * 1000;

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
          cached_at INTEGER NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function buildCacheKey(artist: string, title: string): string {
  return `${artist.trim().toLowerCase()}::${title.trim().toLowerCase()}`;
}

export async function getCachedLyrics(
  artist: string,
  title: string
): Promise<CachedLyricsRecord | null> {
  const db = await getDb();
  const cacheKey = buildCacheKey(artist, title);
  const row = await db.getFirstAsync<{ payload_json: string; cached_at: number }>(
    'SELECT payload_json, cached_at FROM lyrics_cache WHERE cache_key = ?',
    cacheKey
  );

  if (!row) return null;

  const ageMs = Date.now() - row.cached_at;
  if (ageMs > LYRICS_TTL_MS) {
    await db.runAsync('DELETE FROM lyrics_cache WHERE cache_key = ?', cacheKey);
    return null;
  }

  return JSON.parse(row.payload_json) as CachedLyricsRecord;
}

export async function setCachedLyrics(
  artist: string,
  title: string,
  record: CachedLyricsRecord
): Promise<void> {
  const db = await getDb();
  const cacheKey = buildCacheKey(artist, title);
  await db.runAsync(
    'INSERT OR REPLACE INTO lyrics_cache (cache_key, payload_json, cached_at) VALUES (?, ?, ?)',
    cacheKey,
    JSON.stringify(record),
    Date.now()
  );
}
