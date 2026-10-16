import * as SQLite from 'expo-sqlite';

const DB_NAME = 'encore.db';

export type ShowPackStatus = 'idle' | 'downloading' | 'ready';

export type ShowPackRecord = {
  showId: string;
  status: ShowPackStatus;
  lyricsCached: number;
  lyricsTotal: number;
  downloadedAt: number | null;
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
          downloaded_at INTEGER
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function getShowPackRecord(showId: string): Promise<ShowPackRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    show_id: string;
    status: string;
    lyrics_cached: number;
    lyrics_total: number;
    downloaded_at: number | null;
  }>(
    'SELECT show_id, status, lyrics_cached, lyrics_total, downloaded_at FROM show_pack WHERE show_id = ?',
    showId
  );

  if (!row) return null;

  return {
    showId: row.show_id,
    status: row.status as ShowPackStatus,
    lyricsCached: row.lyrics_cached,
    lyricsTotal: row.lyrics_total,
    downloadedAt: row.downloaded_at,
  };
}

export async function setShowPackRecord(record: ShowPackRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO show_pack (show_id, status, lyrics_cached, lyrics_total, downloaded_at)
     VALUES (?, ?, ?, ?, ?)`,
    record.showId,
    record.status,
    record.lyricsCached,
    record.lyricsTotal,
    record.downloadedAt
  );
}
