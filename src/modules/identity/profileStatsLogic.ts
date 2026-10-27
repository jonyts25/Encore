import { isShowActive } from '@/modules/events/visibility';
import type { Show } from '@/modules/events/types';

export type ProfileStats = {
  showsAttended: number;
  distinctArtists: number;
  distinctCities: number;
  upcomingGoing: number;
};

export function computeProfileStats(params: {
  attendedShows: Pick<Show, 'artist_id' | 'venue'>[];
  goingShows: Pick<Show, 'show_date'>[];
  now?: Date;
}): ProfileStats {
  const { attendedShows, goingShows, now = new Date() } = params;
  const artists = new Set(attendedShows.map((show) => show.artist_id));
  const cities = new Set(
    attendedShows.map((show) => show.venue.city?.trim()).filter((city): city is string => Boolean(city))
  );
  const upcomingGoing = goingShows.filter((show) => isShowActive(show.show_date, now)).length;

  return {
    showsAttended: attendedShows.length,
    distinctArtists: artists.size,
    distinctCities: cities.size,
    upcomingGoing,
  };
}
