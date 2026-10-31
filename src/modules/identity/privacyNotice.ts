import * as WebBrowser from 'expo-web-browser';

import { i18n } from '@/core/i18n';
import { privacyNoticeUrl, type PrivacyLocale } from '@/core/config/encoreBrand';

export function currentPrivacyLocale(): PrivacyLocale {
  return i18n.language.startsWith('en') ? 'en' : 'es';
}

export function privacyNoticeUrlForLocale(locale?: PrivacyLocale): string {
  return privacyNoticeUrl(locale ?? currentPrivacyLocale());
}

export async function openPrivacyNoticeInBrowser(locale?: PrivacyLocale): Promise<void> {
  await WebBrowser.openBrowserAsync(privacyNoticeUrlForLocale(locale));
}
