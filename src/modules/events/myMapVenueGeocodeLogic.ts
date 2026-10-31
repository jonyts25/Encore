import type { Show, VenueSummary } from './types';

export const VENUE_GEOCODE_RETRY_MS = 24 * 60 * 60 * 1000;

export type VenueGeocodeAuthStatus = 'updated' | 'not_found' | 'skipped' | 'error';

export function shouldRecordVenueGeocodeAttempt(status: VenueGeocodeAuthStatus): boolean {
  return status === 'updated' || status === 'not_found' || status === 'skipped';
}

export function venueMissingCoordinates(venue: VenueSummary): boolean {
  return venue.lat == null || venue.lng == null || !Number.isFinite(venue.lat) || !Number.isFinite(venue.lng);
}

export function uniqueUnlocatedVenueIds(shows: Show[]): string[] {
  const ids = new Set<string>();
  for (const show of shows) {
    if (venueMissingCoordinates(show.venue)) {
      ids.add(show.venue_id);
    }
  }
  return [...ids];
}

export function filterVenueIdsEligibleForGeocode(
  venueIds: string[],
  lastAttemptByVenueId: ReadonlyMap<string, number>,
  nowMs: number,
  cooldownMs = VENUE_GEOCODE_RETRY_MS
): string[] {
  return venueIds.filter((venueId) => {
    const lastAttempt = lastAttemptByVenueId.get(venueId);
    if (lastAttempt == null) return true;
    return nowMs - lastAttempt >= cooldownMs;
  });
}
