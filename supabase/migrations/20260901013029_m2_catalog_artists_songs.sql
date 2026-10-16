
-- M2 — Catalog: capa canónica de datos musicales. Lectura pública abierta.
create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  mbid text unique, -- MusicBrainz ID, identificador canónico
  name text not null,
  image_url text,
  genres text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  title text not null,
  mbid text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  name text not null,
  year integer,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  country text,
  lat double precision,
  lng double precision,
  capacity integer,
  created_at timestamptz not null default now()
);

create table if not exists shows (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  tour_id uuid references tours(id) on delete set null,
  venue_id uuid references venues(id) on delete set null,
  show_date timestamptz not null, -- guardar con timezone del venue, siempre
  setlistfm_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_songs_artist on songs(artist_id);
create index if not exists idx_tours_artist on tours(artist_id);
create index if not exists idx_shows_artist on shows(artist_id);
create index if not exists idx_shows_tour on shows(tour_id);
create index if not exists idx_shows_date on shows(show_date);

-- Catálogo: lectura abierta para todos (incluso guests), sin RLS restrictivo
alter table artists enable row level security;
alter table songs enable row level security;
alter table tours enable row level security;
alter table venues enable row level security;
alter table shows enable row level security;

create policy "artists_public_read" on artists for select using (true);
create policy "songs_public_read" on songs for select using (true);
create policy "tours_public_read" on tours for select using (true);
create policy "venues_public_read" on venues for select using (true);
create policy "shows_public_read" on shows for select using (true);
;
