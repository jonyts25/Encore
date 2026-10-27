import { hasConfirmedTime } from './visibility';
import type { Show } from './types';

export type ShowCardMetaParts = {
  shortDate: string;
  timeOrUnconfirmed: string;
  venueName: string;
};

const DEFAULT_VENUE_TIMEZONE = 'America/Mexico_City';

function localeTag(locale: string): string {
  return locale.startsWith('en') ? 'en-US' : 'es-MX';
}

function formatTimeInZone(date: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

function formatCalendarDate(showDate: string, locale: string): string {
  const date = new Date(showDate);
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function resolveVenueTimezone(venue: Show['venue']): string {
  const tz = venue.timezone?.trim();
  return tz && tz.length > 0 ? tz : DEFAULT_VENUE_TIMEZONE;
}

export type ShowVenueDateDisplay = {
  calendarLine: string;
  venueTimeLine: string | null;
  deviceTimeHint: string | null;
};

function formatShortShowDate(showDate: string, locale: string): string {
  const date = new Date(showDate);
  const tag = localeTag(locale);
  return new Intl.DateTimeFormat(tag, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatShowCardMetaParts(
  show: Pick<Show, 'show_date' | 'venue'>,
  locale: string,
  t: (key: string) => string
): ShowCardMetaParts {
  const shortDate = formatShortShowDate(show.show_date, locale);
  if (!hasConfirmedTime(show.show_date)) {
    return {
      shortDate,
      timeOrUnconfirmed: t('events.timeUnconfirmed'),
      venueName: show.venue.name,
    };
  }
  const venueTz = resolveVenueTimezone(show.venue);
  const time = formatTimeInZone(new Date(show.show_date), venueTz, locale);
  return {
    shortDate,
    timeOrUnconfirmed: time,
    venueName: show.venue.name,
  };
}

/** e.g. "jue 29 oct · 21:00 · Arena Guadalajara" (venue local time, no GMT). */
export function formatShowCardMetaLine(
  show: Pick<Show, 'show_date' | 'venue'>,
  locale: string,
  t: (key: string) => string
): string {
  const parts = formatShowCardMetaParts(show, locale, t);
  return `${parts.shortDate} · ${parts.timeOrUnconfirmed} · ${parts.venueName}`;
}

export function formatShowVenueTimeOnly(
  show: Pick<Show, 'show_date' | 'venue'>,
  locale: string
): string | null {
  if (!hasConfirmedTime(show.show_date)) return null;
  const venueTz = resolveVenueTimezone(show.venue);
  return formatTimeInZone(new Date(show.show_date), venueTz, locale);
}

export function formatShowVenueDateDisplay(
  show: Pick<Show, 'show_date' | 'venue'>,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string
): ShowVenueDateDisplay {
  const date = new Date(show.show_date);
  const calendarLine = formatCalendarDate(show.show_date, locale);

  if (!hasConfirmedTime(show.show_date)) {
    return {
      calendarLine,
      venueTimeLine: t('events.timeUnconfirmed'),
      deviceTimeHint: null,
    };
  }

  const venueTz = resolveVenueTimezone(show.venue);
  const venueClock = formatTimeInZone(date, venueTz, locale);
  const deviceClock = formatTimeInZone(date, Intl.DateTimeFormat().resolvedOptions().timeZone, locale);

  const venueTimeLine = t('events.showVenueTime', {
    time: venueClock,
    city: show.venue.city,
  });

  const deviceTimeHint =
    venueClock !== deviceClock
      ? t('events.showDeviceTimeHint', { time: deviceClock })
      : null;

  return { calendarLine, venueTimeLine, deviceTimeHint };
}
