export type FestivalVenuePayload = {
  name: string;
  city: string;
  country?: string;
  timezone?: string;
};

export type FestivalLineupEntryPayload = {
  artist: string;
  day: string;
  stage?: string | null;
  start?: string | null;
  end?: string | null;
};

export type FestivalImportPayload = {
  name: string;
  edition_year: number;
  venue: FestivalVenuePayload;
  start_date: string;
  end_date: string;
  lineup: FestivalLineupEntryPayload[];
};

export type FestivalValidationSummary = {
  payload: FestivalImportPayload;
  dayCount: number;
  lineupCount: number;
  uniqueArtists: string[];
  foundArtists: string[];
  missingArtists: string[];
};

export type AdminUpsertFestivalResult = {
  festival_id: string;
  shows_created: number;
  shows_updated: number;
  missing_artists: string[];
};
