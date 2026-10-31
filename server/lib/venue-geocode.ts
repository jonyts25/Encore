import type { SupabaseClient } from '@supabase/supabase-js';

import { geocodeVenueNameCityCountry } from './geocode';

export type VenueGeocodeRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
};

export type GeocodeVenueResult =
  | { status: 'updated'; venueId: string; lat: number; lng: number }
  | { status: 'not_found'; venueId: string }
  | { status: 'skipped'; venueId: string; reason: 'has_coordinates' | 'missing_fields' };

export async function geocodeVenueById(
  supabase: SupabaseClient,
  venueId: string,
  options?: { force?: boolean }
): Promise<GeocodeVenueResult> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, country, lat, lng')
    .eq('id', venueId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { status: 'not_found', venueId };
  }

  const row = data as VenueGeocodeRow;
  const hasCoords = row.lat != null && row.lng != null;
  if (hasCoords && !options?.force) {
    return { status: 'skipped', venueId, reason: 'has_coordinates' };
  }

  if (!row.name?.trim() || !row.city?.trim() || !row.country?.trim()) {
    return { status: 'skipped', venueId, reason: 'missing_fields' };
  }

  const coords = await geocodeVenueNameCityCountry(row.name, row.city, row.country);
  if (!coords) {
    return { status: 'not_found', venueId };
  }

  const { error: updateError } = await supabase
    .from('venues')
    .update({ lat: coords.lat, lng: coords.lng })
    .eq('id', venueId);

  if (updateError) throw updateError;

  return { status: 'updated', venueId, lat: coords.lat, lng: coords.lng };
}

export type GeocodeMissingVenuesSummary = {
  updated: string[];
  notFound: Array<{ id: string; name: string; city: string; country: string }>;
  skipped: string[];
};

export async function geocodeMissingVenues(
  supabase: SupabaseClient,
  options?: { forceVenueId?: string; force?: boolean }
): Promise<GeocodeMissingVenuesSummary> {
  const summary: GeocodeMissingVenuesSummary = {
    updated: [],
    notFound: [],
    skipped: [],
  };

  if (options?.forceVenueId) {
    const result = await geocodeVenueById(supabase, options.forceVenueId, {
      force: options.force ?? true,
    });
    applySingleResult(summary, result);
    return summary;
  }

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, country, lat, lng')
    .or('lat.is.null,lng.is.null')
    .order('created_at', { ascending: true });

  if (error) throw error;

  for (const row of (data ?? []) as VenueGeocodeRow[]) {
    const result = await geocodeVenueById(supabase, row.id, { force: false });
    applySingleResult(summary, result, row);
  }

  return summary;
}

function applySingleResult(
  summary: GeocodeMissingVenuesSummary,
  result: GeocodeVenueResult,
  row?: VenueGeocodeRow
): void {
  switch (result.status) {
    case 'updated':
      summary.updated.push(result.venueId);
      break;
    case 'skipped':
      summary.skipped.push(result.venueId);
      break;
    case 'not_found':
      summary.notFound.push({
        id: result.venueId,
        name: row?.name ?? result.venueId,
        city: row?.city ?? '',
        country: row?.country ?? '',
      });
      break;
    default:
      break;
  }
}
