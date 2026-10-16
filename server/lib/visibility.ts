export const SHOW_ACTIVE_WINDOW_HOURS = 30;

const MS_PER_HOUR = 60 * 60 * 1000;

export function activeCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - SHOW_ACTIVE_WINDOW_HOURS * MS_PER_HOUR).toISOString();
}
