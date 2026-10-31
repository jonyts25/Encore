import type { SetlistDraftItem } from './types';

export const ENCORE_DIVIDER_KEY = 'encore-divider';

export type SetlistSongRow = {
  kind: 'song';
  item: SetlistDraftItem;
};

export type SetlistEncoreRow = {
  kind: 'encore';
  key: typeof ENCORE_DIVIDER_KEY;
};

export type SetlistListRow = SetlistSongRow | SetlistEncoreRow;

export function buildRowsFromDraft(
  items: SetlistDraftItem[],
  encoreStartIndex: number | null
): SetlistListRow[] {
  const rows: SetlistListRow[] = [];
  for (let index = 0; index < items.length; index += 1) {
    if (encoreStartIndex != null && index === encoreStartIndex) {
      rows.push({ kind: 'encore', key: ENCORE_DIVIDER_KEY });
    }
    rows.push({ kind: 'song', item: items[index]! });
  }
  if (encoreStartIndex == null || encoreStartIndex >= items.length) {
    rows.push({ kind: 'encore', key: ENCORE_DIVIDER_KEY });
  }
  return rows;
}

export function rowsToDraft(itemsRows: SetlistListRow[]): {
  items: SetlistDraftItem[];
  encoreStartIndex: number | null;
} {
  const items = itemsRows.filter((row): row is SetlistSongRow => row.kind === 'song').map((row) => row.item);
  const encoreRowIndex = itemsRows.findIndex((row) => row.kind === 'encore');
  if (encoreRowIndex < 0) {
    return { items, encoreStartIndex: null };
  }
  const hasEncoreSongs = itemsRows.slice(encoreRowIndex + 1).some((row) => row.kind === 'song');
  if (!hasEncoreSongs) {
    return { items, encoreStartIndex: null };
  }
  let songCountBefore = 0;
  for (let i = 0; i < encoreRowIndex; i += 1) {
    if (itemsRows[i]?.kind === 'song') songCountBefore += 1;
  }
  return { items, encoreStartIndex: songCountBefore };
}

export function reorderSetlistRows(rows: SetlistListRow[], fromIndex: number, toIndex: number): SetlistListRow[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length) {
    return rows;
  }
  const next = [...rows];
  const [removed] = next.splice(fromIndex, 1);
  if (!removed) return rows;
  next.splice(toIndex, 0, removed);
  return next;
}

export type SetlistDraftSnapshot = {
  rating: number | null;
  note: string;
  songKeys: string[];
  played: boolean[];
  highlights: boolean[];
  encoreAfterSongCount: number | null;
};

export function snapshotFromDraft(
  rating: number | null,
  note: string,
  rows: SetlistListRow[]
): SetlistDraftSnapshot {
  const { items, encoreStartIndex } = rowsToDraft(rows);
  return {
    rating,
    note: note.trim(),
    songKeys: items.map((item) => item.key),
    played: items.map((item) => item.played),
    highlights: items.map((item) => item.isHighlight),
    encoreAfterSongCount: encoreStartIndex,
  };
}

export function snapshotsEqual(a: SetlistDraftSnapshot, b: SetlistDraftSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
