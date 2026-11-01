/** Branding and public URLs for the Encore API server (keep in sync with shared/encoreConfig.ts). */

export const APP_NAME = 'Encore';

/** Replace when a real inbox is available; shown on privacy pages until then. */
export const PRIVACY_CONTACT_EMAIL = '[correo pendiente]';

/** Public Railway API host; change when a custom domain is ready. */
export const PUBLIC_SERVER_BASE_URL = 'https://encore-api-production-5b9a.up.railway.app';

export type PrivacyLocale = 'es' | 'en';

export function privacyNoticePath(locale: PrivacyLocale): '/privacidad' | '/privacy' {
  return locale === 'en' ? '/privacy' : '/privacidad';
}

export function privacyNoticeUrl(locale: PrivacyLocale): string {
  return `${PUBLIC_SERVER_BASE_URL}${privacyNoticePath(locale)}`;
}

export function privacyContactEmail(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.PRIVACY_CONTACT_EMAIL?.trim() : undefined;
  if (fromEnv) return fromEnv;
  return PRIVACY_CONTACT_EMAIL;
}

/** ISO date string for the legal text (YYYY-MM-DD). */
export const PRIVACY_NOTICE_LAST_UPDATED = '2026-10-31';
