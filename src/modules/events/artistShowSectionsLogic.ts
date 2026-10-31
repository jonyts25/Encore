import type { Show, ShowStatus } from './types';
import { isShowActive } from './visibility';

export type ArtistShowSectionsInput = {
  upcomingForArtist: Show[];
  userShowRows: { show_id: string; status: ShowStatus }[];
  attendedShows: Show[];
  artistId: string;
  now?: Date;
};

export type ArtistShowSectionsResult = {
  yours: Show[];
  other: Show[];
  attended: Show[];
};

const ARTIST_PAGE_USER_STATUSES: ShowStatus[] = ['voy', 'interesado', 'fui', 'no_fui'];

export function artistPageUserStatuses(): ShowStatus[] {
  return ARTIST_PAGE_USER_STATUSES;
}

/** Splits artist page lists; upcoming query window may include past shows still inside activeCutoffIso. */
export function buildArtistShowSections(input: ArtistShowSectionsInput): ArtistShowSectionsResult {
  const now = input.now ?? new Date();
  const upcomingActive = input.upcomingForArtist.filter((show) => isShowActive(show, now));

  const showIdsWithUserStatus = new Set(input.userShowRows.map((row) => row.show_id));
  const yoursIds = new Set(
    input.userShowRows
      .filter((row) => row.status === 'voy' || row.status === 'interesado')
      .map((row) => row.show_id)
  );

  const yours = upcomingActive.filter((show) => yoursIds.has(show.id));
  const other = upcomingActive.filter((show) => !showIdsWithUserStatus.has(show.id));
  const attended = input.attendedShows.filter((show) => show.artist_id === input.artistId);

  return { yours, other, attended };
}
