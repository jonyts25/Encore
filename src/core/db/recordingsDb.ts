import * as SQLite from 'expo-sqlite';

const DB_NAME = 'encore.db';

export type RecordingRow = {
  id: string;
  showId: string | null;
  songTitle: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number | null;
  saved: boolean;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recordings (
          id TEXT PRIMARY KEY NOT NULL,
          show_id TEXT,
          song_title TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          duration_seconds REAL,
          saved INTEGER NOT NULL DEFAULT 0
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function createRecordingId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function startRecordingSession(params: {
  showId?: string | null;
  songTitle: string;
}): Promise<string> {
  const db = await getDb();
  const id = createRecordingId();
  const startedAt = Date.now();

  await db.runAsync(
    `INSERT INTO recordings (id, show_id, song_title, started_at, ended_at, duration_seconds, saved)
     VALUES (?, ?, ?, ?, NULL, NULL, 0)`,
    id,
    params.showId ?? null,
    params.songTitle,
    startedAt
  );

  return id;
}

export async function finishRecordingSession(params: {
  recordingId: string;
  saved: boolean;
  endedAt?: number;
}): Promise<void> {
  const db = await getDb();
  const endedAt = params.endedAt ?? Date.now();

  const row = await db.getFirstAsync<{ started_at: number }>(
    'SELECT started_at FROM recordings WHERE id = ?',
    params.recordingId
  );

  const durationSeconds = row ? (endedAt - row.started_at) / 1000 : null;

  await db.runAsync(
    `UPDATE recordings
     SET ended_at = ?, duration_seconds = ?, saved = ?
     WHERE id = ?`,
    endedAt,
    durationSeconds,
    params.saved ? 1 : 0,
    params.recordingId
  );
}
