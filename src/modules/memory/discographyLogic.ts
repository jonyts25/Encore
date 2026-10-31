import { showCalendarYear } from '@/modules/events/myMapLogic';
import type { Show } from '@/modules/events/types';

import type {
  DiscographyMonthGroup,
  DiscographyShowEntry,
  DiscographyStats,
  DiscographyYearFilter,
} from './types';

export function filterDiscographyEntriesByYear(
  entries: DiscographyShowEntry[],
  year: DiscographyYearFilter
): DiscographyShowEntry[] {
  if (year === 'all') return entries;
  return entries.filter((entry) => showCalendarYear(entry.show) === year);
}

export function listDiscographyYears(entries: DiscographyShowEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    years.add(showCalendarYear(entry.show));
  }
  return [...years].sort((a, b) => b - a);
}

function monthKeyForShow(show: Show): string {
  const source = show.local_date?.trim() || show.show_date;
  const date = new Date(source);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function computeDiscographyStats(
  entries: DiscographyShowEntry[],
  year: DiscographyYearFilter,
  favoriteArtistIds: string[]
): DiscographyStats {
  const scoped = filterDiscographyEntriesByYear(entries, year);
  const artistIds = new Set<string>();
  const cities = new Set<string>();
  const countries = new Set<string>();
  const monthCounts = new Map<string, number>();
  let liveSongs = 0;
  let hasConfirmedSetlist = false;
  let firstPendingSetlistShowId: string | null = null;

  const sortedPending = [...scoped].sort(
    (a, b) => new Date(b.show.show_date).getTime() - new Date(a.show.show_date).getTime()
  );

  for (const entry of scoped) {
    artistIds.add(entry.show.artist_id);
    if (entry.show.venue.city?.trim()) {
      cities.add(entry.show.venue.city.trim().toLowerCase());
    }
    if (entry.show.venue.country?.trim()) {
      countries.add(entry.show.venue.country.trim().toLowerCase());
    }

    const key = monthKeyForShow(entry.show);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);

    if (entry.memory.setlistConfirmedAt) {
      hasConfirmedSetlist = true;
      liveSongs += entry.memory.songsPlayedCount;
    }
  }

  for (const entry of sortedPending) {
    if (!entry.memory.setlistConfirmedAt) {
      firstPendingSetlistShowId = entry.show.id;
      break;
    }
  }

  let busiestMonthKey: string | null = null;
  let busiestCount = 0;
  for (const [key, count] of monthCounts.entries()) {
    if (count > busiestCount) {
      busiestCount = count;
      busiestMonthKey = key;
    }
  }

  const favoriteSet = new Set(favoriteArtistIds);
  const seenFavorites = new Set<string>();
  for (const entry of scoped) {
    if (favoriteSet.has(entry.show.artist_id)) {
      seenFavorites.add(entry.show.artist_id);
    }
  }

  return {
    concerts: scoped.length,
    distinctArtists: artistIds.size,
    liveSongs,
    cities: cities.size,
    countries: countries.size,
    busiestMonthKey,
    favoritesSeen: seenFavorites.size,
    favoritesTotal: favoriteArtistIds.length,
    hasConfirmedSetlist,
    firstPendingSetlistShowId,
  };
}

export function groupDiscographyByMonth(
  entries: DiscographyShowEntry[],
  year: DiscographyYearFilter,
  locale: string
): DiscographyMonthGroup[] {
  const scoped = filterDiscographyEntriesByYear(entries, year);
  const sorted = [...scoped].sort(
    (a, b) => new Date(b.show.show_date).getTime() - new Date(a.show.show_date).getTime()
  );

  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  const formatter = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' });

  const groups = new Map<string, DiscographyShowEntry[]>();
  for (const entry of sorted) {
    const key = monthKeyForShow(entry.show);
    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthEntries]) => {
      const [y, m] = monthKey.split('-').map(Number);
      const label = formatter.format(new Date(y, m - 1, 1));
      return { monthKey, label, entries: monthEntries };
    });
}
