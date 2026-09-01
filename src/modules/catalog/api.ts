import { supabase } from '@/core/api/supabase';

import type { Artist } from './types';

export async function listPublicArtists(limit = 50): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('id, mbid, name, image_url, genres, created_at')
    .order('name', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Artist[];
}
