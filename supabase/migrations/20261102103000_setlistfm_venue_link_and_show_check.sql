-- setlist.fm venue id + dedupe shows by setlist.fm setlist id + link attempt timestamp

alter table public.venues
  add column if not exists setlistfm_venue_id text;

create unique index if not exists idx_venues_setlistfm_venue_id
  on public.venues (setlistfm_venue_id)
  where setlistfm_venue_id is not null;

create unique index if not exists idx_shows_setlistfm_id_unique
  on public.shows (setlistfm_id)
  where setlistfm_id is not null;

alter table public.shows
  add column if not exists setlist_checked_at timestamptz;

comment on column public.shows.setlist_checked_at is
  'Last automatic setlist.fm lookup/link attempt for this show (12h cooldown in API).';

comment on column public.venues.setlistfm_venue_id is
  'setlist.fm venue id; canonical match key for ingested venues.';
