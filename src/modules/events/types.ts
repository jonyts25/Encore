export type ShowStatus = 'interesado' | 'voy' | 'fui';

export type ArtistSummary = {
  id: string;
  name: string;
  image_url: string | null;
  genres: string[] | null;
};

export type VenueSummary = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
};

export type Show = {
  id: string;
  artist_id: string;
  tour_id: string | null;
  venue_id: string;
  show_date: string;
  setlistfm_id: string | null;
  created_at: string;
  artist: ArtistSummary;
  venue: VenueSummary;
};

export type UserShow = {
  user_id: string;
  show_id: string;
  status: ShowStatus;
  ticket_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type ShowStatusState = {
  status: ShowStatus | null;
};
