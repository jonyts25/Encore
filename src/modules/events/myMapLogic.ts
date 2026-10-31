import type { Show, VenueSummary } from './types';

export type MyMapVenueGroup = {
  venue: VenueSummary;
  shows: Show[];
};

export type MyMapStats = {
  concerts: number;
  cities: number;
  countries: number;
};

export type MyMapData = {
  locatedGroups: MyMapVenueGroup[];
  unlocatedShows: Show[];
  stats: MyMapStats;
  years: number[];
};

export function showCalendarYear(show: Show): number {
  const source = show.local_date?.trim() || show.show_date;
  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }
  return new Date(show.show_date).getFullYear();
}

export function filterAttendedShowsByYear(shows: Show[], year: number | 'all'): Show[] {
  if (year === 'all') return shows;
  return shows.filter((show) => showCalendarYear(show) === year);
}

export function computeMyMapStats(shows: Show[]): MyMapStats {
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const show of shows) {
    if (show.venue.city?.trim()) cities.add(show.venue.city.trim().toLowerCase());
    if (show.venue.country?.trim()) countries.add(show.venue.country.trim().toLowerCase());
  }
  return {
    concerts: shows.length,
    cities: cities.size,
    countries: countries.size,
  };
}

export function listConcertYears(shows: Show[]): number[] {
  const years = new Set<number>();
  for (const show of shows) {
    years.add(showCalendarYear(show));
  }
  return [...years].sort((a, b) => b - a);
}

function hasVenueCoordinates(venue: VenueSummary): boolean {
  return venue.lat != null && venue.lng != null && Number.isFinite(venue.lat) && Number.isFinite(venue.lng);
}

export function groupAttendedShowsByVenue(shows: Show[]): {
  locatedGroups: MyMapVenueGroup[];
  unlocatedShows: Show[];
} {
  const sorted = [...shows].sort(
    (a, b) => new Date(b.show_date).getTime() - new Date(a.show_date).getTime()
  );

  const byVenue = new Map<string, Show[]>();
  const unlocatedShows: Show[] = [];

  for (const show of sorted) {
    if (!hasVenueCoordinates(show.venue)) {
      unlocatedShows.push(show);
      continue;
    }
    const bucket = byVenue.get(show.venue_id) ?? [];
    bucket.push(show);
    byVenue.set(show.venue_id, bucket);
  }

  const locatedGroups: MyMapVenueGroup[] = [...byVenue.entries()]
    .map(([, venueShows]) => ({
      venue: venueShows[0]!.venue,
      shows: venueShows.sort(
        (a, b) => new Date(b.show_date).getTime() - new Date(a.show_date).getTime()
      ),
    }))
    .sort((a, b) => {
      const aLatest = new Date(a.shows[0]!.show_date).getTime();
      const bLatest = new Date(b.shows[0]!.show_date).getTime();
      return bLatest - aLatest;
    });

  return { locatedGroups, unlocatedShows };
}

export function buildMyMapData(shows: Show[]): MyMapData {
  const { locatedGroups, unlocatedShows } = groupAttendedShowsByVenue(shows);
  return {
    locatedGroups,
    unlocatedShows,
    stats: computeMyMapStats(shows),
    years: listConcertYears(shows),
  };
}

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export function mapCoordinatesFromGroups(groups: MyMapVenueGroup[]): MapCoordinate[] {
  return groups
    .filter((group) => hasVenueCoordinates(group.venue))
    .map((group) => ({
      latitude: group.venue.lat as number,
      longitude: group.venue.lng as number,
    }));
}

export const SINGLE_VENUE_LATITUDE_DELTA = 0.08;

export function regionForSingleVenue(coordinate: MapCoordinate) {
  return {
    ...coordinate,
    latitudeDelta: SINGLE_VENUE_LATITUDE_DELTA,
    longitudeDelta: SINGLE_VENUE_LATITUDE_DELTA,
  };
}

export function pinArtistForGroup(group: MyMapVenueGroup): {
  name: string;
  imageUrl: string | null;
  extraCount: number;
} {
  const primary = group.shows[0]?.artist;
  return {
    name: primary?.name ?? group.venue.name,
    imageUrl: primary?.image_url ?? null,
    extraCount: Math.max(0, group.shows.length - 1),
  };
}
