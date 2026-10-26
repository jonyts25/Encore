export const SHOW_ACTIVE_WINDOW_HOURS = 30;

const MS_PER_HOUR = 60 * 60 * 1000;
const SHOW_DAY_LEAD_HOURS = 12;

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

export function getShowPhase(
  showDate: string,
  now: Date = new Date()
): 'upcoming' | 'today' | 'past' {
  const showTime = new Date(showDate).getTime();
  const nowTime = now.getTime();
  const leadMs = SHOW_DAY_LEAD_HOURS * MS_PER_HOUR;
  const tailMs = SHOW_ACTIVE_WINDOW_HOURS * MS_PER_HOUR;

  if (nowTime < showTime - leadMs) return 'upcoming';
  if (nowTime <= showTime + tailMs) return 'today';
  return 'past';
}

/** Show stays on Home while `now` is within 30 hours after `showDate`. */
export function isShowActive(showDate: string, now: Date = new Date()): boolean {
  const showTime = new Date(showDate).getTime();
  const windowEnd = showTime + SHOW_ACTIVE_WINDOW_HOURS * MS_PER_HOUR;
  return now.getTime() < windowEnd;
}
