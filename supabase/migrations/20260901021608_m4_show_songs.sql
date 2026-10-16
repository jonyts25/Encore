
-- M4 — Setlist Intelligence: canciones tocadas por show (setlist real, ingesta de setlist.fm)
create table if not exists show_songs (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position integer,
  is_encore boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_show_songs_show on show_songs(show_id);
create index if not exists idx_show_songs_song on show_songs(song_id);
create unique index if not exists idx_show_songs_unique on show_songs(show_id, song_id, position);

alter table show_songs enable row level security;

create policy "show_songs_public_read" on show_songs for select using (true);

-- Cache de predicciones ya calculadas (evita recalcular en cada request)
create table if not exists setlist_predictions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null unique references shows(id) on delete cascade,
  payload_json jsonb not null,
  confidence numeric,
  generated_at timestamptz not null default now()
);

alter table setlist_predictions enable row level security;
create policy "setlist_predictions_public_read" on setlist_predictions for select using (true);
;
