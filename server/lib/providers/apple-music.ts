import { createSign } from 'crypto';

const CATALOG_STOREFRONT = 'mx';
const ARTWORK_SIZE_PX = 500;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 150;
const TOKEN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000;

type CachedDeveloperToken = {
  token: string;
  expiresAtMs: number;
};

type AppleMusicArtwork = {
  url?: string;
  width?: number;
  height?: number;
};

type AppleMusicArtistAttributes = {
  name?: string;
  artwork?: AppleMusicArtwork;
  genreNames?: string[];
};

type AppleMusicArtistResource = {
  id?: string;
  attributes?: AppleMusicArtistAttributes;
};

type AppleMusicSearchResponse = {
  results?: {
    artists?: {
      data?: AppleMusicArtistResource[];
    };
  };
};

export type AppleMusicArtistMatch = {
  id: string;
  name: string;
  imageUrl: string | null;
  genreNames: string[];
};

let cachedDeveloperToken: CachedDeveloperToken | null = null;

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return buffer.toString('base64url');
}

function getAppleMusicCredentials():
  | { teamId: string; keyId: string; privateKey: string }
  | null {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID?.trim();
  const keyId = process.env.APPLE_MUSIC_KEY_ID?.trim();
  const rawPrivateKey = process.env.APPLE_MUSIC_PRIVATE_KEY?.trim();

  if (!teamId || !keyId || !rawPrivateKey) return null;

  const privateKey = rawPrivateKey.includes('\\n')
    ? rawPrivateKey.replace(/\\n/g, '\n')
    : rawPrivateKey;

  return { teamId, keyId, privateKey };
}

function signDeveloperToken(params: {
  teamId: string;
  keyId: string;
  privateKey: string;
  issuedAtSeconds: number;
  expiresAtSeconds: number;
}): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: params.keyId }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: params.teamId,
      iat: params.issuedAtSeconds,
      exp: params.expiresAtSeconds,
    })
  );
  const signingInput = `${header}.${payload}`;

  const signature = createSign('SHA256')
    .update(signingInput)
    .sign({ key: params.privateKey, dsaEncoding: 'ieee-p1363' });

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function buildAppleMusicArtworkUrl(
  template: string,
  sizePx = ARTWORK_SIZE_PX
): string {
  return template.replace('{w}', String(sizePx)).replace('{h}', String(sizePx));
}

export async function getAppleMusicDeveloperToken(): Promise<string> {
  const nowMs = Date.now();
  if (
    cachedDeveloperToken &&
    cachedDeveloperToken.expiresAtMs - TOKEN_REFRESH_BUFFER_MS > nowMs
  ) {
    return cachedDeveloperToken.token;
  }

  const credentials = getAppleMusicCredentials();
  if (!credentials) {
    throw new Error('Apple Music credentials are not configured');
  }

  const issuedAtSeconds = Math.floor(nowMs / 1000);
  const expiresAtSeconds = issuedAtSeconds + TOKEN_TTL_SECONDS;
  const token = signDeveloperToken({
    teamId: credentials.teamId,
    keyId: credentials.keyId,
    privateKey: credentials.privateKey,
    issuedAtSeconds,
    expiresAtSeconds,
  });

  cachedDeveloperToken = {
    token,
    expiresAtMs: expiresAtSeconds * 1000,
  };

  return token;
}

function buildAppleMusicFallbackTerms(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [];

  const lastName = parts[parts.length - 1];
  return lastName.toLowerCase() === fullName.trim().toLowerCase() ? [] : [lastName];
}

function pickBestArtistMatch(
  artists: AppleMusicArtistResource[],
  searchName: string,
  acceptNames: string[] = []
): AppleMusicArtistResource | null {
  if (artists.length === 0) return null;

  const accepted = new Set(
    [searchName, ...acceptNames]
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)
  );

  const exact = artists.find((artist) =>
    accepted.has(artist.attributes?.name?.trim().toLowerCase() ?? '')
  );
  if (exact) return exact;

  return artists[0] ?? null;
}

async function searchArtistOnce(
  term: string,
  acceptNames: string[]
): Promise<AppleMusicArtistMatch | null> {
  const trimmedTerm = term.trim();
  if (!trimmedTerm) return null;

  const credentials = getAppleMusicCredentials();
  if (!credentials) return null;

  const token = await getAppleMusicDeveloperToken();
  const url = new URL(`https://api.music.apple.com/v1/catalog/${CATALOG_STOREFRONT}/search`);
  url.searchParams.set('term', trimmedTerm);
  url.searchParams.set('types', 'artists');
  url.searchParams.set('limit', '10');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Apple Music search failed (${response.status})`);
  }

  const payload = (await response.json()) as AppleMusicSearchResponse;
  const match = pickBestArtistMatch(payload.results?.artists?.data ?? [], trimmedTerm, acceptNames);
  if (!match?.id) return null;

  const attributes = match.attributes;
  const artworkTemplate = attributes?.artwork?.url?.trim();
  const imageUrl = artworkTemplate ? buildAppleMusicArtworkUrl(artworkTemplate) : null;

  return {
    id: match.id,
    name: attributes?.name?.trim() ?? trimmedTerm,
    imageUrl,
    genreNames: attributes?.genreNames ?? [],
  };
}

export async function searchArtist(name: string): Promise<AppleMusicArtistMatch | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const fallbackTerms = buildAppleMusicFallbackTerms(trimmedName);
  const acceptNames = [trimmedName, ...fallbackTerms];

  const primary = await searchArtistOnce(trimmedName, acceptNames);
  if (primary?.imageUrl) return primary;

  for (const term of fallbackTerms) {
    const fallback = await searchArtistOnce(term, acceptNames);
    if (fallback?.imageUrl) return fallback;
  }

  return primary ?? null;
}
