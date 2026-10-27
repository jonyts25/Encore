import {
  confirmArtistResolution,
  fetchArtistSearch,
  searchLocalArtists,
} from '@/modules/catalog/api';

export type ArtistResolveOutcome = {
  name: string;
  artistId: string | null;
  skippedReason?: 'ambiguous' | 'network' | 'not_found';
};

export async function resolveArtistNameForFestival(name: string): Promise<ArtistResolveOutcome> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { name: trimmed, artistId: null, skippedReason: 'not_found' };
  }

  try {
    const local = await searchLocalArtists(trimmed, 8);
    if (local.length === 1) {
      return { name: trimmed, artistId: local[0].id };
    }
    const exact = local.find((artist) => artist.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      return { name: trimmed, artistId: exact.id };
    }
    if (local.length > 1) {
      return { name: trimmed, artistId: null, skippedReason: 'ambiguous' };
    }

    const search = await fetchArtistSearch(trimmed);
    if (search.artists.length === 1) {
      return { name: trimmed, artistId: search.artists[0].id };
    }
    if (search.source === 'resolved' && search.artists[0]) {
      return { name: trimmed, artistId: search.artists[0].id };
    }
    if (search.candidates.length === 1) {
      const artist = await confirmArtistResolution(search.candidates[0].mbid);
      return { name: trimmed, artistId: artist.id };
    }
    if (search.candidates.length > 1) {
      return { name: trimmed, artistId: null, skippedReason: 'ambiguous' };
    }
  } catch {
    return { name: trimmed, artistId: null, skippedReason: 'network' };
  }

  return { name: trimmed, artistId: null, skippedReason: 'not_found' };
}

export async function resolveMissingFestivalArtists(names: string[]): Promise<ArtistResolveOutcome[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const results: ArtistResolveOutcome[] = [];
  for (const name of unique) {
    results.push(await resolveArtistNameForFestival(name));
  }
  return results;
}
