import * as SQLite from 'expo-sqlite';

import type { ChecklistItem, ChecklistItemId, StoredChecklist } from '../types';

const DB_NAME = 'encore-prep.db';

const DEFAULT_ITEM_IDS: ChecklistItemId[] = ['transport', 'battery', 'cash', 'outfit'];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS prep_checklists (
          show_id TEXT PRIMARY KEY NOT NULL,
          items_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export function createDefaultChecklistItems(): ChecklistItem[] {
  return DEFAULT_ITEM_IDS.map((id) => ({ id, checked: false }));
}

export async function loadChecklist(showId: string): Promise<ChecklistItem[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ items_json: string }>(
    'SELECT items_json FROM prep_checklists WHERE show_id = ?',
    [showId]
  );

  if (!row?.items_json) {
    return createDefaultChecklistItems();
  }

  try {
    const parsed = JSON.parse(row.items_json) as ChecklistItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultChecklistItems();
    }
    return mergeWithDefaults(parsed);
  } catch {
    return createDefaultChecklistItems();
  }
}

function mergeWithDefaults(items: ChecklistItem[]): ChecklistItem[] {
  const byId = new Map(items.map((item) => [item.id, item.checked]));
  return DEFAULT_ITEM_IDS.map((id) => ({
    id,
    checked: byId.get(id) ?? false,
  }));
}

export async function saveChecklist(showId: string, items: ChecklistItem[]): Promise<StoredChecklist> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const itemsJson = JSON.stringify(items);

  await db.runAsync(
    `INSERT INTO prep_checklists (show_id, items_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(show_id) DO UPDATE SET items_json = excluded.items_json, updated_at = excluded.updated_at`,
    [showId, itemsJson, updatedAt]
  );

  return { showId, items, updatedAt };
}

export async function resetChecklist(showId: string): Promise<ChecklistItem[]> {
  const items = createDefaultChecklistItems();
  await saveChecklist(showId, items);
  return items;
}
