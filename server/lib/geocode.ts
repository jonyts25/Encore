const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Encore/1.0 (https://encore.app; contact@encore.app)';
const MIN_INTERVAL_MS = 1000;

let lastRequestStartedAt = 0;
let requestChain: Promise<void> = Promise.resolve();

export function buildNominatimQuery(venueName: string, city: string, country: string): string {
  return [venueName.trim(), city.trim(), country.trim()].filter(Boolean).join(', ');
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestStartedAt;
  const waitMs = Math.max(0, MIN_INTERVAL_MS - elapsed);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestStartedAt = Date.now();
}

export function withGeocodeRateLimit<T>(operation: () => Promise<T>): Promise<T> {
  const run = requestChain.then(async () => {
    await waitForRateLimit();
    return operation();
  });
  requestChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

type NominatimResult = {
  lat?: string;
  lon?: string;
};

export async function geocodeVenueNameCityCountry(
  venueName: string,
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  const q = buildNominatimQuery(venueName, city, country);
  if (!q) return null;

  return withGeocodeRateLimit(async () => {
    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim request failed (${response.status})`);
    }

    const payload = (await response.json()) as NominatimResult[];
    const hit = payload[0];
    if (!hit?.lat || !hit.lon) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  });
}
