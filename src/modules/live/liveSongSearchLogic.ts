export type LiveSongSearchSegment = 'predicted' | 'others' | 'all';

export type NamedSong = { id: string; title: string };

export function normalizeSongSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

export function matchesSongSearch(title: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return title.toLowerCase().includes(normalizedQuery);
}

export function collectPackSongTitles(
  predicted: readonly { title: string }[],
  others: readonly { title: string }[]
): string[] {
  const titles = new Set<string>();
  for (const song of predicted) titles.add(song.title);
  for (const song of others) titles.add(song.title);
  return [...titles];
}

export function filterSongsByQuery<T extends { title: string }>(
  songs: readonly T[],
  normalizedQuery: string
): T[] {
  if (!normalizedQuery) return [...songs];
  return songs.filter((song) => matchesSongSearch(song.title, normalizedQuery));
}

export function isRepertoireSegmentAvailable(isOffline: boolean): boolean {
  return !isOffline;
}

export function repertoireTitlesFromCatalog(songs: readonly NamedSong[]): string[] {
  return songs.map((song) => song.title);
}

export function mergeUniqueTitles(primary: string[], secondary: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const title of [...primary, ...secondary]) {
    if (seen.has(title)) continue;
    seen.add(title);
    merged.push(title);
  }
  return merged;
}

export function pickSearchScope(params: {
  segment: LiveSongSearchSegment;
  isOffline: boolean;
}): LiveSongSearchSegment {
  if (params.segment === 'all' && params.isOffline) {
    return 'predicted';
  }
  return params.segment;
}
