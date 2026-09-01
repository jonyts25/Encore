export type SetlistFmArtist = {
  mbid: string;
  name: string;
  sortName?: string;
  disambiguation?: string;
  url?: string;
};

export type SetlistFmSong = {
  name: string;
  info?: string;
  tape?: boolean;
  cover?: { name?: string; mbid?: string };
  with?: { name?: string; mbid?: string };
};

export type SetlistFmSet = {
  name?: string;
  encore?: number;
  song?: SetlistFmSong | SetlistFmSong[];
};

export type SetlistFmVenue = {
  id?: string;
  name: string;
  city: {
    id?: string;
    name: string;
    state?: string;
    stateCode?: string;
    coords?: { lat: number; long: number };
    country: { code: string; name: string };
  };
  url?: string;
};

export type SetlistFmTour = {
  name: string;
};

export type SetlistFmSetlist = {
  id: string;
  versionId?: string;
  eventDate: string;
  lastUpdated?: string;
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  tour?: SetlistFmTour;
  sets?: {
    set?: SetlistFmSet | SetlistFmSet[];
  };
  info?: string;
  url?: string;
};

export type SetlistFmPaginated<T> = {
  type?: string;
  itemsPerPage?: number;
  page?: number;
  total?: number;
  artist?: T[];
  setlist?: T[];
  setlists?: T[];
};

export type ParsedSetlistSong = {
  title: string;
  position: number;
  is_encore: boolean;
  notes: string | null;
};

export interface SetlistFmAdapter {
  searchArtistsByName(name: string, page?: number): Promise<SetlistFmArtist[]>;
  getArtistSetlists(mbid: string, page?: number): Promise<SetlistFmSetlist[]>;
  getSetlist(setlistId: string): Promise<SetlistFmSetlist>;
}
