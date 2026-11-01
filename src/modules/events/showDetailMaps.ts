import type { VenueSummary } from './types';

export function buildAppleMapsUrl(
  venue: Pick<VenueSummary, 'name' | 'city' | 'lat' | 'lng'>
): string {
  const query = encodeURIComponent(`${venue.name}, ${venue.city}`);
  if (venue.lat != null && venue.lng != null) {
    return `maps://?q=${query}&ll=${venue.lat},${venue.lng}`;
  }
  return `maps://?q=${query}`;
}
