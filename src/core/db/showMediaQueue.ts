import * as SQLite from 'expo-sqlite';

import type { ShowMediaInsertPayload } from '@/modules/events/showMediaTypes';

const DB_NAME = 'encore.db';

export type PendingShowMediaRow = {
  id: string;
  payload_json: string;
  created_at: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS show_media_pending (
          id TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function createPendingId(): string {
  return `sm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueShowMediaPending(payload: ShowMediaInsertPayload): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO show_media_pending (id, payload_json, created_at) VALUES (?, ?, ?)`,
    createPendingId(),
    JSON.stringify(payload),
    Date.now()
  );
}

export async function listShowMediaPending(): Promise<ShowMediaInsertPayload[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PendingShowMediaRow>(
    `SELECT id, payload_json, created_at FROM show_media_pending ORDER BY created_at ASC`
  );
  return rows.map((row) => JSON.parse(row.payload_json) as ShowMediaInsertPayload);
}

export async function removeShowMediaPendingIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM show_media_pending WHERE id IN (${placeholders})`, ...ids);
}

export async function listShowMediaPendingWithIds(): Promise<
  { id: string; payload: ShowMediaInsertPayload }[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<PendingShowMediaRow>(
    `SELECT id, payload_json, created_at FROM show_media_pending ORDER BY created_at ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    payload: JSON.parse(row.payload_json) as ShowMediaInsertPayload,
  }));
}

export async function clearShowMediaPending(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM show_media_pending');
}
