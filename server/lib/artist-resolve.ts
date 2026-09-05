import { ensureArtistImageUrl } from './artist-photos';
import {
  extractArtistLinksFromRelations,
  fetchMusicBrainzArtistByMbid,
  fetchMusicBrainzArtistUrlRelations,
  filterAmbiguousCandidates,
  pickAutoResolvableCandidate,
  searchMusicBrainzArtistCandidates,
  type MusicBrainzArtistMatch,
} from './providers/musicbrainz';
import { createSupabaseAdminClient, createSupabaseClient } from './supabase';

export type CatalogArtist = {
  id: string;
  mbid: string | null;
  name: string;
  image_url: string | null;
  genres: string[] | null;
  created_at: string;
};

export type ArtistResolutionCandidate = {
  mbid: string;
  name: string;
  score: number;
  disambiguation: string | null;
  country: string | null;
  type: string | null;
  genres: string[] | null;
};

export type ArtistSearchResult = {
  source: 'local' | 'resolved' | 'ambiguous' | 'none';
  artists: CatalogArtist[];
  candidates: ArtistResolutionCandidate[];
  query: string;
};

const ARTIST_COLUMNS = 'id, mbid, name, image_url, genres, created_at';

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_,]/g, (char) => `\\${char}`);
}

export async function searchLocalArtists(query: string, limit = 20): Promise<CatalogArtist[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const supabase = createSupabaseClient();
  const pattern = `%${escapeIlikePattern(trimmedQuery)}%`;

  const { data: byName, error: byNameError } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .ilike('name', pattern)
    .order('name', { ascending: true })
    .limit(limit);

  if (byNameError) throw byNameError;
  if ((byName ?? []).length > 0) return (byName ?? []) as CatalogArtist[];

  const { data: catalog, error: catalogError } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .order('name', { ascending: true })
    .limit(100);

  if (catalogError) throw catalogError;

  const normalized = trimmedQuery.toLowerCase();
  return ((catalog ?? []) as CatalogArtist[]).filter((artist) => {
    const nameMatch = artist.name.toLowerCase().includes(normalized);
    const genreMatch =
      artist.genres?.some((genre) => genre.toLowerCase().includes(normalized)) ?? false;
    return nameMatch || genreMatch;
  });
}

async function findArtistByMbid(mbid: string): Promise<CatalogArtist | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .eq('mbid', mbid)
    .maybeSingle();

  if (error) throw error;
  return (data as CatalogArtist | null) ?? null;
}

async function upsertArtistLinks(artistId: string, mbid: string): Promise<void> {
  const relations = await fetchMusicBrainzArtistUrlRelations(mbid);
  const links = extractArtistLinksFromRelations(relations);
  if (links.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const rows = links.map((link) => ({
    artist_id: artistId,
    platform: link.platform,
    url: link.url,
    source: 'musicbrainz',
    created_at: now,
  }));

  const { error } = await supabase
    .from('artist_links')
    .upsert(rows, { onConflict: 'artist_id,platform' });

  if (error) throw error;
}

async function persistResolvedArtist(match: MusicBrainzArtistMatch): Promise<CatalogArtist> {
  const existing = await findArtistByMbid(match.mbid);
  if (existing) {
    await upsertArtistLinks(existing.id, match.mbid).catch(() => undefined);
    return ensureArtistImageUrl(existing);
  }

  const supabase = createSupabaseAdminClient();
  const createdAt = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from('artists')
    .insert({
      mbid: match.mbid,
      name: match.name,
      genres: match.genres,
      image_url: null,
      created_at: createdAt,
    })
    .select(ARTIST_COLUMNS)
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const raced = await findArtistByMbid(match.mbid);
      if (raced) return raced;
    }
    throw insertError;
  }

  const artist = inserted as CatalogArtist;
  await upsertArtistLinks(artist.id, match.mbid).catch(() => undefined);
  return ensureArtistImageUrl(artist);
}

export async function confirmArtistResolution(mbid: string): Promise<CatalogArtist | null> {
  const trimmedMbid = mbid.trim();
  if (!trimmedMbid) return null;

  const existing = await findArtistByMbid(trimmedMbid);
  if (existing) {
    await upsertArtistLinks(existing.id, trimmedMbid).catch(() => undefined);
    return ensureArtistImageUrl(existing);
  }

  const details = await fetchMusicBrainzArtistByMbid(trimmedMbid);
  if (!details) return null;

  return persistResolvedArtist(details);
}

export async function searchArtistsWithResolution(query: string): Promise<ArtistSearchResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { artists: [], candidates: [], source: 'none', query: '' };
  }

  const localMatches = await searchLocalArtists(trimmedQuery);
  if (localMatches.length > 0) {
    return { artists: localMatches, candidates: [], source: 'local', query: trimmedQuery };
  }

  const rawCandidates = await searchMusicBrainzArtistCandidates(trimmedQuery);
  if (rawCandidates.length === 0) {
    return { artists: [], candidates: [], source: 'none', query: trimmedQuery };
  }

  const autoMatch = pickAutoResolvableCandidate(rawCandidates, trimmedQuery);
  if (autoMatch) {
    const resolved = await persistResolvedArtist({
      mbid: autoMatch.mbid,
      name: autoMatch.name,
      genres: autoMatch.genres,
    });
    return { artists: [resolved], candidates: [], source: 'resolved', query: trimmedQuery };
  }

  const candidates = filterAmbiguousCandidates(rawCandidates);
  if (candidates.length === 0) {
    return { artists: [], candidates: [], source: 'none', query: trimmedQuery };
  }

  return { artists: [], candidates, source: 'ambiguous', query: trimmedQuery };
}
