import { createSupabaseAdminClient } from './supabase';
import type { VenueSummary } from './types';

type GooglePlacePhotoResponse = {
  photos?: Array<{
    name?: string;
  }>;
};

const PLACES_FIELD_MASK = 'photos';

function getGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key || null;
}

function buildVenueSearchQuery(venue: Pick<VenueSummary, 'name' | 'city' | 'country'>): string {
  return `${venue.name}, ${venue.city}, ${venue.country}`;
}

async function findPlacePhotoName(query: string, apiKey: string): Promise<string | null> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed (${response.status})`);
  }

  const payload = (await response.json()) as { places?: GooglePlacePhotoResponse[] };
  const photoName = payload.places?.[0]?.photos?.[0]?.name;
  return photoName ?? null;
}

function buildPlacePhotoUrl(photoName: string, apiKey: string): string {
  const params = new URLSearchParams({
    maxWidthPx: '1200',
    key: apiKey,
  });
  return `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`;
}

export async function ensureVenuePhotoUrl(
  venue: VenueSummary
): Promise<VenueSummary> {
  if (venue.photo_url) return venue;

  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return venue;

  try {
    const photoName = await findPlacePhotoName(buildVenueSearchQuery(venue), apiKey);
    if (!photoName) return venue;

    const photoUrl = buildPlacePhotoUrl(photoName, apiKey);
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('venues').update({ photo_url: photoUrl }).eq('id', venue.id);

    if (error) throw error;

    return { ...venue, photo_url: photoUrl };
  } catch {
    return venue;
  }
}
