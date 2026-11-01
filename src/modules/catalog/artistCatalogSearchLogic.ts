import type { Artist } from './types';

export const ARTIST_CATALOG_SEARCH_DEBOUNCE_MS = 400;
export const ARTIST_REMOTE_SEARCH_TIMEOUT_MS = 10_000;

export function shouldAutoFetchRemote(localCount: number, forceRemote: boolean): boolean {
  return forceRemote || localCount === 0;
}

export function shouldOfferWorldwideSearch(
  trimmedQuery: string,
  localCount: number,
  remoteFetchedForQuery: boolean,
  isResolving: boolean
): boolean {
  return (
    trimmedQuery.length > 0 &&
    localCount > 0 &&
    !remoteFetchedForQuery &&
    !isResolving
  );
}

export function mergeArtistLists(local: Artist[], remote: Artist[]): Artist[] {
  const seen = new Set<string>();
  const merged: Artist[] = [];

  for (const artist of [...local, ...remote]) {
    if (seen.has(artist.id)) continue;
    seen.add(artist.id);
    merged.push(artist);
  }

  return merged;
}

export function isStaleRequest(generation: number, latestGeneration: number): boolean {
  return generation !== latestGeneration;
}
