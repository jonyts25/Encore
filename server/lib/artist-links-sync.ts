import { ensureArtistImageUrl } from './artist-photos';
import type { ArtistLinkPlatform } from './artist-link-types';
import {
  extractArtistLinksFromRelations,
  fetchMusicBrainzArtistUrlRelations,
} from './providers/musicbrainz';
import { createSupabaseAdminClient } from './supabase';

type ArtistRow = {
  id: string;
  name: string;
  mbid: string | null;
  image_url: string | null;
};

export type ArtistLinksSyncResult = {
  artist_id: string;
  artist_name: string;
  mbid: string;
  links_upserted: number;
  platforms: ArtistLinkPlatform[];
};

export async function syncArtistLinksFromMusicBrainz(artistId: string): Promise<ArtistLinksSyncResult> {
  const supabase = createSupabaseAdminClient();

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name, mbid, image_url')
    .eq('id', artistId)
    .maybeSingle();

  if (artistError) throw artistError;
  if (!artist) throw new Error(`Artist not found: ${artistId}`);

  const artistRow = artist as ArtistRow;
  if (!artistRow.mbid) {
    throw new Error(`Artist ${artistRow.name} has no MusicBrainz ID (mbid)`);
  }

  const relations = await fetchMusicBrainzArtistUrlRelations(artistRow.mbid);
  const links = extractArtistLinksFromRelations(relations);

  await ensureArtistImageUrl({
    id: artistRow.id,
    name: artistRow.name,
    image_url: artistRow.image_url,
  });

  if (links.length === 0) {
    return {
      artist_id: artistRow.id,
      artist_name: artistRow.name,
      mbid: artistRow.mbid,
      links_upserted: 0,
      platforms: [],
    };
  }

  const now = new Date().toISOString();
  const rows = links.map((link) => ({
    artist_id: artistRow.id,
    platform: link.platform,
    url: link.url,
    source: 'musicbrainz',
    created_at: now,
  }));

  const { error: upsertError } = await supabase
    .from('artist_links')
    .upsert(rows, { onConflict: 'artist_id,platform' });

  if (upsertError) throw upsertError;

  return {
    artist_id: artistRow.id,
    artist_name: artistRow.name,
    mbid: artistRow.mbid,
    links_upserted: rows.length,
    platforms: rows.map((row) => row.platform as ArtistLinkPlatform),
  };
}

export async function listArtistLinks(artistId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('artist_links')
    .select('artist_id, platform, url, source, created_at')
    .eq('artist_id', artistId)
    .order('platform', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
