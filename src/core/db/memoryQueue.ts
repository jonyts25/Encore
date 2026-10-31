import * as SQLite from 'expo-sqlite';

import type { MemorySavePayload } from '@/modules/memory/types';

const DB_NAME = 'encore.db';

export type PendingMemoryRow = {
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
        CREATE TABLE IF NOT EXISTS memory_pending (
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
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueMemoryPending(payload: MemorySavePayload): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO memory_pending (id, payload_json, created_at) VALUES (?, ?, ?)`,
    createPendingId(),
    JSON.stringify(payload),
    Date.now()
  );
}

export async function listMemoryPendingWithIds(): Promise<
  { id: string; payload: MemorySavePayload }[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<PendingMemoryRow>(
    `SELECT id, payload_json, created_at FROM memory_pending ORDER BY created_at ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    payload: JSON.parse(row.payload_json) as MemorySavePayload,
  }));
}

export async function removeMemoryPendingIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM memory_pending WHERE id IN (${placeholders})`, ...ids);
}

export async function clearMemoryPending(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM memory_pending');
}
