const MEXICO_CITY_NAMES = new Set([
  'mexico city',
  'ciudad de mexico',
  'ciudad de méxico',
  'cdmx',
  'distrito federal',
]);

const US_STATE_TIMEZONES: Record<string, string> = {
  CA: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  AZ: 'America/Phoenix',
  CO: 'America/Denver',
  TX: 'America/Chicago',
  IL: 'America/Chicago',
  NY: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  NC: 'America/New_York',
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

function normalizeCountryCode(countryCode: string | undefined, countryName: string): string | null {
  const code = countryCode?.trim().toUpperCase();
  if (code && code.length === 2) return code;
  const name = normalizeToken(countryName);
  if (name === 'mexico' || name === 'mexico (mx)' || name === 'méxico') return 'MX';
  if (name === 'united states' || name === 'usa' || name === 'us') return 'US';
  return null;
}

export function resolveSetlistFmVenueTimezone(params: {
  city: string;
  countryName: string;
  countryCode?: string;
  stateCode?: string;
}): string | null {
  const country = normalizeCountryCode(params.countryCode, params.countryName);
  const city = normalizeToken(params.city);

  if (country === 'MX') {
    if (city.includes('tijuana')) return 'America/Tijuana';
    if (city.includes('cancun') || city.includes('cancún')) return 'America/Cancun';
    if (
      MEXICO_CITY_NAMES.has(city) ||
      city.includes('monterrey') ||
      city.includes('guadalajara')
    ) {
      return 'America/Mexico_City';
    }
    return null;
  }

  if (country === 'US') {
    const state = params.stateCode?.trim().toUpperCase();
    if (state && US_STATE_TIMEZONES[state]) {
      return US_STATE_TIMEZONES[state];
    }
    return null;
  }

  return null;
}
