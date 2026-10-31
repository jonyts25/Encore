import { hasConfirmedTime } from './visibility';
import { resolveVenueTimezone } from './showVenueTime';
import type { Show } from './types';

const MS_PER_HOUR = 60 * 60 * 1000;
const BEFORE_SHOW_HOURS = 2;
const AFTER_SHOW_HOURS = 6;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedDateParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

function zonedWallClockToUtc(
  localDate: string,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const [targetYear, targetMonth, targetDay] = localDate.split('-').map(Number);

  const targetScore =
    targetYear * 1_000_000 + targetMonth * 10_000 + targetDay * 100 + hour;

  let low = Date.UTC(targetYear, targetMonth - 1, targetDay - 1);
  let high = Date.UTC(targetYear, targetMonth - 1, targetDay + 1, 23, 59, 59);

  while (high - low > 1_000) {
    const mid = Math.floor((low + high) / 2);
    const parts = getZonedDateParts(new Date(mid), timeZone);
    const score = parts.year * 1_000_000 + parts.month * 10_000 + parts.day * 100 + parts.hour;
    if (score < targetScore) {
      low = mid;
    } else {
      high = mid;
    }
  }

  for (let attempt = high; attempt <= high + 60_000; attempt += 1_000) {
    const parts = getZonedDateParts(new Date(attempt), timeZone);
    if (
      parts.year === targetYear &&
      parts.month === targetMonth &&
      parts.day === targetDay &&
      parts.hour === hour &&
      parts.minute === minute &&
      parts.second === second
    ) {
      return new Date(attempt);
    }
  }

  return new Date(high);
}

function addCalendarDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function resolveShowLocalDate(show: Pick<Show, 'show_date' | 'local_date' | 'venue'>): string {
  if (show.local_date) return show.local_date;
  const tz = resolveVenueTimezone(show.venue);
  const parts = getZonedDateParts(new Date(show.show_date), tz);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export type ShowNightSearchWindow = {
  createdAfter: Date;
  createdBefore: Date;
};

/** Time range for MediaLibrary search around a attended show. */
export function getShowNightSearchWindow(
  show: Pick<Show, 'show_date' | 'local_date' | 'venue'>
): ShowNightSearchWindow {
  const venueTz = resolveVenueTimezone(show.venue);

  if (!hasConfirmedTime(show.show_date)) {
    const localDate = resolveShowLocalDate(show);
    const createdAfter = zonedWallClockToUtc(localDate, 0, 0, 0, venueTz);
    const nextDayStart = zonedWallClockToUtc(addCalendarDays(localDate, 1), 0, 0, 0, venueTz);
    const createdBefore = new Date(nextDayStart.getTime() - 1);
    return { createdAfter, createdBefore };
  }

  const center = new Date(show.show_date);
  return {
    createdAfter: new Date(center.getTime() - BEFORE_SHOW_HOURS * MS_PER_HOUR),
    createdBefore: new Date(center.getTime() + AFTER_SHOW_HOURS * MS_PER_HOUR),
  };
}

export function mapMediaLibraryType(
  mediaType: string
): 'photo' | 'video' | null {
  if (mediaType === 'photo' || mediaType === 'image') return 'photo';
  if (mediaType === 'video') return 'video';
  return null;
}
