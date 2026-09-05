import { ensureArtistImageUrl } from './artist-photos';
import {
  extractArtistLinksFromRelations,
  fetchMusicBrainzArtistUrlRelations,
  searchMusicBrainzArtists,
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

const ARTIST_COLUMNS = 'id, mbid, name, image_url, genres, created_at';

export type ArtistSearchResult = {
  artists: CatalogArtist[];
  source: 'local' | 'resolved' | 'none';
};

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

export async function resolveArtistFromMusicBrainz(name: string): Promise<CatalogArtist | null> {
  const match = await searchMusicBrainzArtists(name);
  if (!match) return null;

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

export async function searchArtistsWithResolution(query: string): Promise<ArtistSearchResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { artists: [], source: 'none' };
  }

  const localMatches = await searchLocalArtists(trimmedQuery);
  if (localMatches.length > 0) {
    return { artists: localMatches, source: 'local' };
  }

  const resolved = await resolveArtistFromMusicBrainz(trimmedQuery);
  if (!resolved) {
    return { artists: [], source: 'none' };
  }

  return { artists: [resolved], source: 'resolved' };
}
