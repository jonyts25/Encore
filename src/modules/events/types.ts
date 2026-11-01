export type ShowStatus = 'interesado' | 'voy' | 'fui' | 'no_fui';

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
  photo_url?: string | null;
  timezone?: string | null;
};

export type ShowSource = 'setlistfm' | 'user' | 'ticketmaster';

export type TourSummary = {
  id: string;
  name: string;
};

export type Show = {
  id: string;
  artist_id: string;
  tour_id: string | null;
  tour?: TourSummary | null;
  venue_id: string;
  show_date: string;
  local_date?: string;
  time_confirmed?: boolean;
  source?: ShowSource;
  setlistfm_id: string | null;
  enriched_at?: string | null;
  setlist_checked_at?: string | null;
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

export type HomeShowSections = {
  going: Show[];
  goingAttendancePending: Show[];
  interested: Show[];
  forYou: Show[];
  attended: Show[];
};

export type ArtistShowSections = {
  yours: Show[];
  other: Show[];
  attended: Show[];
  userStatusByShowId: Partial<Record<string, ShowStatus>>;
  ratingsByShowId: Partial<Record<string, number>>;
};
