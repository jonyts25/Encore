export type Artist = {
  id: string;
  mbid: string | null;
  name: string;
  image_url: string | null;
  genres: string[] | null;
  created_at: string;
};
