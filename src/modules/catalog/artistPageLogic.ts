import type { Show, ShowStatus } from '@/modules/events/types';

export type ArtistLiveStats = {
  count: number;
  lastShow: Show;
};

export function buildArtistUpcomingShows(yours: Show[], other: Show[]): Show[] {
  return [...yours, ...other];
}

export function buildArtistLiveStats(attended: Show[]): ArtistLiveStats | null {
  if (attended.length === 0) return null;
  const sorted = [...attended].sort(
    (a, b) => new Date(b.show_date).getTime() - new Date(a.show_date).getTime()
  );
  return { count: attended.length, lastShow: sorted[0]! };
}

export function formatArtistLastSeenMonthYear(showDate: string, locale: string): string {
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, { month: 'short', year: 'numeric' })
    .format(new Date(showDate))
    .replace('.', '');
}

export function showDateParts(showDate: string, locale: string): { day: string; month: string } {
  const date = new Date(showDate);
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  const month = new Intl.DateTimeFormat(tag, { month: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  return { day: String(date.getDate()), month };
}

export function upcomingStatusLabelKey(status: ShowStatus | null): string | null {
  if (status === 'voy') return 'catalog.concertStatusGoing';
  if (status === 'interesado') return 'catalog.concertStatusInterested';
  return null;
}
