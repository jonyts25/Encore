import type { ArtistSummary, Show, VenueSummary } from './types';
import { getShowPhase } from './visibility';

export type ExploreSearchGroups = {
  artists: ArtistSummary[];
  shows: Show[];
  venues: VenueSummary[];
};

export type ExploreVenueBucket = {
  venue: VenueSummary;
  upcomingCount: number;
  shows: Show[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeCity(city: string | null | undefined): string {
  return city?.trim() ?? '';
}

export function collectExploreCities(shows: Show[]): string[] {
  const counts = new Map<string, number>();
  for (const show of shows) {
    const city = normalizeCity(show.venue.city);
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([city]) => city);
}

export function pickDefaultExploreCity(params: {
  cities: string[];
  userShowCities: string[];
}): string | null {
  const { cities, userShowCities } = params;
  if (cities.length === 0) return null;

  for (const city of userShowCities) {
    const normalized = normalizeCity(city);
    if (normalized && cities.includes(normalized)) {
      return normalized;
    }
  }

  return cities[0] ?? null;
}

export function filterShowsByCity(shows: Show[], city: string | null): Show[] {
  if (!city) return shows;
  const target = normalizeCity(city).toLowerCase();
  return shows.filter((show) => normalizeCity(show.venue.city).toLowerCase() === target);
}

export function showsThisWeekInCity(shows: Show[], city: string | null, now = new Date()): Show[] {
  const inCity = filterShowsByCity(shows, city);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + WEEK_MS);
  return inCity.filter((show) => {
    const time = new Date(show.show_date).getTime();
    return time >= start.getTime() && time < end.getTime();
  });
}

export function upcomingShowsInCitySorted(shows: Show[], city: string | null, limit = 10): Show[] {
  return filterShowsByCity(shows, city)
    .filter((show) => getShowPhase(show.show_date) !== 'past')
    .sort((a, b) => new Date(a.show_date).getTime() - new Date(b.show_date).getTime())
    .slice(0, limit);
}

export function buildVenueBuckets(shows: Show[], city: string | null): ExploreVenueBucket[] {
  const inCity = filterShowsByCity(shows, city);
  const byVenue = new Map<string, ExploreVenueBucket>();

  for (const show of inCity) {
    const existing = byVenue.get(show.venue.id);
    if (existing) {
      existing.shows.push(show);
      existing.upcomingCount += 1;
      continue;
    }
    byVenue.set(show.venue.id, {
      venue: show.venue,
      upcomingCount: 1,
      shows: [show],
    });
  }

  return [...byVenue.values()].sort(
    (a, b) => b.upcomingCount - a.upcomingCount || a.venue.name.localeCompare(b.venue.name)
  );
}

export function artistsFromAttendedShows(shows: Show[]): ArtistSummary[] {
  const seen = new Map<string, ArtistSummary>();
  for (const show of shows) {
    if (!seen.has(show.artist.id)) {
      seen.set(show.artist.id, show.artist);
    }
  }
  return [...seen.values()];
}

export function rankPopularArtistsFromShows(shows: Show[], limit = 12): ArtistSummary[] {
  const counts = new Map<string, { artist: ArtistSummary; count: number }>();
  for (const show of shows) {
    const current = counts.get(show.artist.id);
    if (current) {
      current.count += 1;
    } else {
      counts.set(show.artist.id, { artist: show.artist, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.artist.name.localeCompare(b.artist.name))
    .slice(0, limit)
    .map((entry) => entry.artist);
}

export function groupExploreSearch(
  query: string,
  artists: ArtistSummary[],
  shows: Show[],
  venues: VenueSummary[]
): ExploreSearchGroups | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  return {
    artists: artists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(q) ||
        artist.genres?.some((genre) => genre.toLowerCase().includes(q))
    ),
    shows: shows.filter(
      (show) =>
        show.artist.name.toLowerCase().includes(q) ||
        show.venue.name.toLowerCase().includes(q) ||
        normalizeCity(show.venue.city).toLowerCase().includes(q)
    ),
    venues: venues.filter(
      (venue) =>
        venue.name.toLowerCase().includes(q) ||
        normalizeCity(venue.city).toLowerCase().includes(q)
    ),
  };
}

export function uniqueVenuesFromShows(shows: Show[]): VenueSummary[] {
  const map = new Map<string, VenueSummary>();
  for (const show of shows) {
    map.set(show.venue.id, show.venue);
  }
  return [...map.values()];
}

export function exploreHasCityContent(params: {
  weekShows: Show[];
  upcoming: Show[];
  seenArtists: ArtistSummary[];
  popularArtists: ArtistSummary[];
  venues: ExploreVenueBucket[];
}): boolean {
  return (
    params.weekShows.length > 0 ||
    params.upcoming.length > 0 ||
    params.seenArtists.length > 0 ||
    params.popularArtists.length > 0 ||
    params.venues.length > 0
  );
}
