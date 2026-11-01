export type MusicStreamingService = 'apple_music' | 'spotify' | 'youtube_music';

export const MUSIC_STREAMING_SERVICES: MusicStreamingService[] = [
  'apple_music',
  'spotify',
  'youtube_music',
];

export function buildAppleMusicSearchUrl(query: string): string {
  return `https://music.apple.com/mx/search?term=${encodeURIComponent(query)}`;
}

export function buildSpotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export function buildYouTubeMusicSearchUrl(query: string): string {
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}

export function buildYouTubeMusicDeepLink(query: string): string {
  return `youtubemusic://search?q=${encodeURIComponent(query)}`;
}

export function buildSongSearchQuery(artist: string, title: string): string {
  return `${artist.trim()} ${title.trim()}`.trim();
}

export function buildSetlistSearchQuery(artist: string): string {
  return `Setlist ${artist.trim()}`.trim();
}

export function buildStreamingSearchUrl(service: MusicStreamingService, query: string): string {
  switch (service) {
    case 'apple_music':
      return buildAppleMusicSearchUrl(query);
    case 'spotify':
      return buildSpotifySearchUrl(query);
    case 'youtube_music':
      return buildYouTubeMusicSearchUrl(query);
    default: {
      const _exhaustive: never = service;
      return _exhaustive;
    }
  }
}

export function orderStreamingServices(
  preference: MusicStreamingService | null
): MusicStreamingService[] {
  if (!preference) return [...MUSIC_STREAMING_SERVICES];
  return [preference, ...MUSIC_STREAMING_SERVICES.filter((service) => service !== preference)];
}
