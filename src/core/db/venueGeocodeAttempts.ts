import * as SQLite from 'expo-sqlite';

const DB_NAME = 'encore.db';

/** Oct 31 2026 07:20 UTC — attempts while server geocode routes were unavailable. */
const PRE_DEPLOY_GEOCODE_ATTEMPT_CUTOFF_MS = Date.UTC(2026, 9, 31, 7, 20, 0);

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let preDeployAttemptsPurged = false;

async function purgePreDeployGeocodeAttempts(db: SQLite.SQLiteDatabase): Promise<void> {
  if (preDeployAttemptsPurged) return;
  preDeployAttemptsPurged = true;
  await db.runAsync('DELETE FROM venue_geocode_attempts WHERE attempted_at < ?', [
    PRE_DEPLOY_GEOCODE_ATTEMPT_CUTOFF_MS,
  ]);
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS venue_geocode_attempts (
          venue_id TEXT PRIMARY KEY NOT NULL,
          attempted_at INTEGER NOT NULL
        );
      `);
      await purgePreDeployGeocodeAttempts(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function readVenueGeocodeAttemptAt(venueId: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ attempted_at: number }>(
    'SELECT attempted_at FROM venue_geocode_attempts WHERE venue_id = ?',
    venueId
  );
  return row?.attempted_at ?? null;
}

export async function recordVenueGeocodeAttempt(venueId: string, attemptedAtMs = Date.now()): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO venue_geocode_attempts (venue_id, attempted_at) VALUES (?, ?)',
    venueId,
    attemptedAtMs
  );
}
