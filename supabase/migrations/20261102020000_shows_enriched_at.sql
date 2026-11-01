alter table public.shows
  add column if not exists enriched_at timestamptz;

comment on column public.shows.enriched_at is
  'Last setlist.fm enrichment run for this show (ingest + tour link + prediction).';
