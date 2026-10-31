import { supabase } from '@/core/api/supabase';

import type { VenueSummary } from './types';

export type VenueNearbyResult = VenueSummary & {
  distance_km: number | null;
};

export async function resolveCityCenterFromVenues(
  city: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = city.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('venues')
    .select('lat, lng')
    .ilike('city', `%${trimmed}%`)
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (error) throw error;
  const points = (data ?? []).filter(
    (row): row is { lat: number; lng: number } =>
      typeof row.lat === 'number' && typeof row.lng === 'number'
  );
  if (points.length === 0) return null;

  const lat = points.reduce((sum, row) => sum + row.lat, 0) / points.length;
  const lng = points.reduce((sum, row) => sum + row.lng, 0) / points.length;
  return { lat, lng };
}
