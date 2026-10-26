export const SHOW_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function expiresAtAfterShowDate(showDate: string): number {
  return new Date(showDate).getTime() + SHOW_CACHE_TTL_MS;
}
