export type Artist = {
  id: string;
  mbid: string | null;
  name: string;
  image_url: string | null;
  genres: string[] | null;
  created_at: string;
};

export type ArtistResolutionCandidate = {
  mbid: string;
  name: string;
  score: number;
  disambiguation: string | null;
  country: string | null;
  type: string | null;
  genres: string[] | null;
};

export type ArtistSearchSource = 'local' | 'resolved' | 'ambiguous' | 'none';

export type ArtistSearchResponse = {
  artists: Artist[];
  candidates: ArtistResolutionCandidate[];
  source: ArtistSearchSource;
  query: string;
};

export type UserArtist = {
  user_id: string;
  artist_id: string;
  followed_at: string;
};

export type ArtistFollowState = {
  isFollowing: boolean;
  followedAt: string | null;
};

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
