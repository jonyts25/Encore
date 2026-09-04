export type Artist = {
  id: string;
  mbid: string | null;
  name: string;
  image_url: string | null;
  genres: string[] | null;
  created_at: string;
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
