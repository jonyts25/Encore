import * as SQLite from 'expo-sqlite';

const DB_NAME = 'encore.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_query_cache (
          cache_key TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function readOfflineQuery<T>(cacheKey: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ payload_json: string }>(
    'SELECT payload_json FROM offline_query_cache WHERE cache_key = ?',
    cacheKey
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload_json) as T;
  } catch {
    return null;
  }
}

export async function writeOfflineQuery<T>(cacheKey: string, payload: T): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO offline_query_cache (cache_key, payload_json, updated_at) VALUES (?, ?, ?)',
    cacheKey,
    JSON.stringify(payload),
    Date.now()
  );
}
