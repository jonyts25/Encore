export type ArtistLinkPlatform =
  | 'spotify'
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'website'
  | 'apple_music';

export type ArtistLink = {
  artist_id: string;
  platform: ArtistLinkPlatform;
  url: string;
  source: string;
  created_at: string;
};

export const ARTIST_LINK_PLATFORMS: ArtistLinkPlatform[] = [
  'spotify',
  'youtube',
  'instagram',
  'tiktok',
  'website',
  'apple_music',
];
