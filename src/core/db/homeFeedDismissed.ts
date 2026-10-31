import * as SQLite from 'expo-sqlite';

const DB_NAME = 'encore.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS home_feed_dismissed (
          user_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          dismissed_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, item_id)
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function listDismissedHomeFeedIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ item_id: string }>(
    'SELECT item_id FROM home_feed_dismissed WHERE user_id = ? ORDER BY dismissed_at DESC',
    userId
  );
  return rows.map((row) => row.item_id);
}

export async function dismissHomeFeedItem(userId: string, itemId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO home_feed_dismissed (user_id, item_id, dismissed_at) VALUES (?, ?, ?)`,
    userId,
    itemId,
    Date.now()
  );
}

export async function clearHomeFeedDismissed(userId: string | null): Promise<void> {
  const db = await getDb();
  if (userId) {
    await db.runAsync('DELETE FROM home_feed_dismissed WHERE user_id = ?', userId);
    return;
  }
  await db.runAsync('DELETE FROM home_feed_dismissed');
}
