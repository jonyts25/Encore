export type VenueDistanceLabelInput = {
  city: string;
  country: string;
  distance_km: number | null;
};

export function formatVenueNearbySubtitle(
  venue: VenueDistanceLabelInput,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (venue.distance_km != null && Number.isFinite(venue.distance_km)) {
    const distance = Math.round(venue.distance_km);
    return t('addShow.venueDistance', { city: venue.city, distance });
  }
  return `${venue.city}, ${venue.country}`;
}
