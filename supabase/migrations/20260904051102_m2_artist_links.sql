
-- M2 — enlaces sociales/streaming del artista, vía MusicBrainz url-rels
create table if not exists artist_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  platform text not null check (platform in ('spotify', 'youtube', 'instagram', 'tiktok', 'website', 'apple_music')),
  url text not null,
  source text not null default 'musicbrainz',
  created_at timestamptz not null default now(),
  unique (artist_id, platform)
);

alter table artist_links enable row level security;
create policy "artist_links_public_read" on artist_links for select using (true);

create index if not exists idx_artist_links_artist on artist_links(artist_id);
;
