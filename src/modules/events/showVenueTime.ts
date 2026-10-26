import { hasConfirmedTime } from './visibility';
import type { Show } from './types';

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
