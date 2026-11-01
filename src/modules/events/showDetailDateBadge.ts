function localeTag(locale: string): string {
  return locale.startsWith('en') ? 'en-US' : 'es-MX';
}

export type ShowDateBadgeParts = {
  month: string;
  day: string;
};

export function formatShowDateBadgeParts(showDate: string, locale: string): ShowDateBadgeParts {
  const date = new Date(showDate);
  const tag = localeTag(locale);
  const month = new Intl.DateTimeFormat(tag, { month: 'short' }).format(date).replace(/\./g, '');
  const day = new Intl.DateTimeFormat(tag, { day: 'numeric' }).format(date);
  return { month, day };
}
