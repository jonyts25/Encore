import { expiresAtAfterShowDate, SHOW_CACHE_TTL_MS } from '@/core/time/showCacheTtl';

export function showPackExpiresAt(showDate: string): number {
  return expiresAtAfterShowDate(showDate);
}

export function isShowPackExpired(
  record: { expiresAt: number | null },
  now = Date.now()
): boolean {
  if (record.expiresAt == null) return false;
  return record.expiresAt < now;
}

export function isShowPackComplete(record: {
  status: string;
  lyricsFailed: number;
}): boolean {
  return record.status === 'ready' && record.lyricsFailed === 0;
}

export function showPackExpiryFromShowDate(showDate: string, now = Date.now()): number {
  const expires = showPackExpiresAt(showDate);
  return expires - now;
}

export { SHOW_CACHE_TTL_MS as SEVEN_DAYS_MS };
