export const SHOW_ACTIVE_WINDOW_HOURS = 30;

const MS_PER_HOUR = 60 * 60 * 1000;
const DEFAULT_VENUE_TIMEZONE = 'America/Mexico_City';
const CONFIRMED_SHOW_TAIL_HOURS = 5;
const UNCONFIRMED_DAY_TAIL_HOURS = 3;

export type ShowVisibilityInput = {
  show_date: string;
  local_date?: string;
  time_confirmed?: boolean;
  venue?: { timezone?: string | null };
};

export function activeCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - SHOW_ACTIVE_WINDOW_HOURS * MS_PER_HOUR).toISOString();
}

export function hasConfirmedTime(showDate: string): boolean {
  const date = new Date(showDate);
  return !(
    date.getUTCHours() === 12 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function resolveVenueTimezone(venue: ShowVisibilityInput['venue'] | undefined): string {
  const tz = venue?.timezone?.trim();
  return tz && tz.length > 0 ? tz : DEFAULT_VENUE_TIMEZONE;
}

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

function formatLocalDateYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addCalendarDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function resolveShowLocalDate(show: ShowVisibilityInput): string {
  if (show.local_date) return show.local_date;
  const tz = resolveVenueTimezone(show.venue);
  const parts = getZonedDateParts(new Date(show.show_date), tz);
  return formatLocalDateYmd(parts.year, parts.month, parts.day);
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
    targetYear * 1_000_000 +
    targetMonth * 10_000 +
    targetDay * 100 +
    hour;

  let low = Date.UTC(targetYear, targetMonth - 1, targetDay - 1);
  let high = Date.UTC(targetYear, targetMonth - 1, targetDay + 1, 23, 59, 59);

  while (high - low > 1_000) {
    const mid = Math.floor((low + high) / 2);
    const parts = getZonedDateParts(new Date(mid), timeZone);
    const score =
      parts.year * 1_000_000 +
      parts.month * 10_000 +
      parts.day * 100 +
      parts.hour;
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

function getShowDayStart(show: ShowVisibilityInput): Date {
  const tz = resolveVenueTimezone(show.venue);
  return zonedWallClockToUtc(resolveShowLocalDate(show), 0, 0, 0, tz);
}

function isShowTimeConfirmed(show: ShowVisibilityInput): boolean {
  return Boolean(show.time_confirmed ?? true) && hasConfirmedTime(show.show_date);
}

export function getShowEnd(show: ShowVisibilityInput): Date {
  if (isShowTimeConfirmed(show)) {
    return new Date(
      new Date(show.show_date).getTime() + CONFIRMED_SHOW_TAIL_HOURS * MS_PER_HOUR
    );
  }

  const tz = resolveVenueTimezone(show.venue);
  const nextLocalDate = addCalendarDays(resolveShowLocalDate(show), 1);
  return zonedWallClockToUtc(nextLocalDate, UNCONFIRMED_DAY_TAIL_HOURS, 0, 0, tz);
}

export function getShowPhase(
  show: ShowVisibilityInput,
  now: Date = new Date()
): 'upcoming' | 'today' | 'past' {
  const nowTime = now.getTime();
  const dayStart = getShowDayStart(show).getTime();
  const end = getShowEnd(show).getTime();

  if (nowTime < dayStart) return 'upcoming';
  if (nowTime <= end) return 'today';
  return 'past';
}

export function isShowActive(show: ShowVisibilityInput, now: Date = new Date()): boolean {
  return getShowPhase(show, now) !== 'past';
}
