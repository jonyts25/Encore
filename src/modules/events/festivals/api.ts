import { supabase } from '@/core/api/supabase';
import { searchLocalArtists } from '@/modules/catalog/api';

import type { AdminUpsertFestivalResult, FestivalImportPayload } from './types';
import { payloadToRpcJson } from './festivalPayloadLogic';

export async function lookupArtistsInCatalog(names: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const name of names) {
    const matches = await searchLocalArtists(name, 5);
    const found = matches.some(
      (artist) => artist.name.toLowerCase() === name.trim().toLowerCase()
    );
    result[name] = found || matches.length === 1;
  }
  return result;
}

export async function adminUpsertFestival(
  payload: FestivalImportPayload
): Promise<AdminUpsertFestivalResult> {
  const { data, error } = await supabase.rpc('admin_upsert_festival', {
    p_payload: payloadToRpcJson(payload),
  });
  if (error) throw error;
  const row = (data ?? {}) as AdminUpsertFestivalResult;
  return {
    festival_id: row.festival_id,
    shows_created: row.shows_created ?? 0,
    shows_updated: row.shows_updated ?? 0,
    missing_artists: Array.isArray(row.missing_artists) ? row.missing_artists : [],
  };
}
