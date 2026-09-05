import { syncArtistLinksFromMusicBrainz } from './artist-links-sync';
import { ensureArtistImageUrl } from './artist-photos';
import { createSupabaseAdminClient } from './supabase';

type ArtistRow = {
  id: string;
  name: string;
  mbid: string | null;
  image_url: string | null;
};

export type ArtistEnrichResult = {
  artist_id: string;
  artist_name: string;
  image_updated: boolean;
  links_upserted: number;
  skipped_reason?: string;
};

export async function enrichArtist(artistId: string): Promise<ArtistEnrichResult> {
  const supabase = createSupabaseAdminClient();
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name, mbid, image_url')
    .eq('id', artistId)
    .maybeSingle();

  if (artistError) throw artistError;
  if (!artist) throw new Error(`Artist not found: ${artistId}`);

  const artistRow = artist as ArtistRow;
  const hadImage = Boolean(artistRow.image_url);

  if (artistRow.mbid) {
    const linkResult = await syncArtistLinksFromMusicBrainz(artistId);
    const { data: refreshed } = await supabase
      .from('artists')
      .select('image_url')
      .eq('id', artistId)
      .maybeSingle();

    return {
      artist_id: artistRow.id,
      artist_name: artistRow.name,
      image_updated: !hadImage && Boolean(refreshed?.image_url),
      links_upserted: linkResult.links_upserted,
    };
  }

  if (!hadImage) {
    const enriched = await ensureArtistImageUrl(artistRow);
    return {
      artist_id: artistRow.id,
      artist_name: artistRow.name,
      image_updated: Boolean(enriched.image_url),
      links_upserted: 0,
      skipped_reason: 'no_mbid',
    };
  }

  return {
    artist_id: artistRow.id,
    artist_name: artistRow.name,
    image_updated: false,
    links_upserted: 0,
    skipped_reason: 'no_mbid',
  };
}

export async function listArtistsNeedingEnrichment(): Promise<ArtistRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('id, name, mbid, image_url')
    .order('name', { ascending: true });

  if (artistsError) throw artistsError;

  const { data: links, error: linksError } = await supabase.from('artist_links').select('artist_id');
  if (linksError) throw linksError;

  const artistIdsWithLinks = new Set((links ?? []).map((row) => row.artist_id));

  return ((artists ?? []) as ArtistRow[]).filter(
    (artist) => !artist.image_url || !artistIdsWithLinks.has(artist.id)
  );
}

export type ArtistEnrichBackfillResult = {
  processed: number;
  results: ArtistEnrichResult[];
  skipped: number;
};

export async function enrichArtistsNeedingBackfill(options?: {
  artistIds?: string[];
  limit?: number;
}): Promise<ArtistEnrichBackfillResult> {
  const limit = options?.limit ?? 50;
  const targets =
    options?.artistIds && options.artistIds.length > 0
      ? options.artistIds
      : (await listArtistsNeedingEnrichment()).slice(0, limit).map((artist) => artist.id);

  const results: ArtistEnrichResult[] = [];
  let skipped = 0;

  for (const artistId of targets.slice(0, limit)) {
    try {
      results.push(await enrichArtist(artistId));
    } catch {
      skipped += 1;
    }
  }

  return {
    processed: results.length,
    results,
    skipped,
  };
}
