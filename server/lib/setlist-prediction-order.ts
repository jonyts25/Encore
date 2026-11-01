import type { SongAggregate } from './setlist-prediction-types';

export const PREDICTION_VERSION = 2;

type AggregateEntry = SongAggregate & { avgPosition: number; latestShowDate: string };

export function medianNormalizedPosition(
  entry: AggregateEntry,
  showLengths: Map<string, number>
): number {
  const normalized = entry.appearances
    .map((appearance) => {
      const length = showLengths.get(appearance.showId) ?? 0;
      if (length <= 0) return appearance.position;
      return appearance.position / length;
    })
    .sort((a, b) => a - b);

  if (normalized.length === 0) return 0;
  const mid = Math.floor(normalized.length / 2);
  if (normalized.length % 2 === 0) {
    return (normalized[mid - 1]! + normalized[mid]!) / 2;
  }
  return normalized[mid]!;
}

export function buildShowOrdersForKeys(
  showIds: readonly string[],
  songsByShow: Map<string, Array<{ position: number; song: { title: string } | null }>>,
  normalizedKeys: Set<string>,
  normalizeTitle: (title: string) => string,
  isNonSongMarker: (title: string) => boolean
): string[][] {
  return showIds.map((showId) => {
    const rows = songsByShow.get(showId) ?? [];
    return rows
      .filter((row) => row.song && !isNonSongMarker(row.song.title))
      .sort((a, b) => a.position - b.position)
      .map((row) => normalizeTitle(row.song!.title))
      .filter((key) => key.length > 0 && normalizedKeys.has(key));
  });
}

export function songBeatsInMajority(a: string, b: string, showOrders: string[][]): boolean {
  let aBefore = 0;
  let bBefore = 0;

  for (const show of showOrders) {
    const indexA = show.indexOf(a);
    const indexB = show.indexOf(b);
    if (indexA === -1 || indexB === -1) continue;
    if (indexA < indexB) aBefore += 1;
    else bBefore += 1;
  }

  return aBefore > bBefore;
}

export function copelandScore(key: string, keys: readonly string[], showOrders: string[][]): number {
  let score = 0;
  for (const other of keys) {
    if (other === key) continue;
    if (songBeatsInMajority(key, other, showOrders)) {
      score += 1;
    }
  }
  return score;
}

export function orderKeysByMajority(
  keys: readonly string[],
  showOrders: string[][],
  medianByKey: Map<string, number>
): string[] {
  return [...keys].sort((a, b) => {
    const scoreDiff = copelandScore(b, keys, showOrders) - copelandScore(a, keys, showOrders);
    if (scoreDiff !== 0) return scoreDiff;
    return (medianByKey.get(a) ?? 0) - (medianByKey.get(b) ?? 0);
  });
}

export function isEncoreMajority(entry: AggregateEntry): boolean {
  const encoreShows = entry.appearances.filter((appearance) => appearance.isEncore).length;
  return encoreShows > entry.appearances.length / 2;
}

export function orderSetlistEntriesByMajority(
  entries: AggregateEntry[],
  showIds: readonly string[],
  songsByShow: Map<string, Array<{ position: number; song: { title: string } | null }>>,
  showLengths: Map<string, number>,
  normalizeTitle: (title: string) => string,
  isNonSongMarker: (title: string) => boolean
): AggregateEntry[] {
  const keySet = new Set(entries.map((entry) => entry.normalizedKey));
  const showOrders = buildShowOrdersForKeys(
    showIds,
    songsByShow,
    keySet,
    normalizeTitle,
    isNonSongMarker
  );
  const medianByKey = new Map(
    entries.map((entry) => [entry.normalizedKey, medianNormalizedPosition(entry, showLengths)])
  );

  const mainKeys = entries.filter((entry) => !isEncoreMajority(entry)).map((e) => e.normalizedKey);
  const encoreKeys = entries.filter((entry) => isEncoreMajority(entry)).map((e) => e.normalizedKey);

  const orderedKeys = [
    ...orderKeysByMajority(mainKeys, showOrders, medianByKey),
    ...orderKeysByMajority(encoreKeys, showOrders, medianByKey),
  ];

  const byKey = new Map(entries.map((entry) => [entry.normalizedKey, entry]));
  return orderedKeys.map((key) => byKey.get(key)!).filter(Boolean);
}
