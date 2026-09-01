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
