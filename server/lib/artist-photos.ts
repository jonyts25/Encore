import { searchArtist } from './providers/apple-music';
import { createSupabaseAdminClient } from './supabase';
import type { ArtistSummary } from './types';

export async function ensureArtistImageUrl<
  T extends Pick<ArtistSummary, 'id' | 'name' | 'image_url'>,
>(artist: T): Promise<T> {
  if (artist.image_url) return artist;

  try {
    const match = await searchArtist(artist.name);
    if (!match?.imageUrl) return artist;

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from('artists')
      .update({ image_url: match.imageUrl })
      .eq('id', artist.id)
      .is('image_url', null);

    if (error) throw error;

    return { ...artist, image_url: match.imageUrl };
  } catch {
    return artist;
  }
}
