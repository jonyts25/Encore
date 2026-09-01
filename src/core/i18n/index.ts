import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export const supportedLocales = ['es', 'en'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const deviceLanguage = getLocales()[0]?.languageCode ?? 'es';
const fallbackLocale: SupportedLocale = supportedLocales.includes(
  deviceLanguage as SupportedLocale
)
  ? (deviceLanguage as SupportedLocale)
  : 'es';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: fallbackLocale,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

export function setLocale(locale: SupportedLocale) {
  void i18n.changeLanguage(locale);
}

export { i18n };
export { useTranslation } from 'react-i18next';
