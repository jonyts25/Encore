
-- Relación de seguimiento: qué artistas sigue cada usuario
create table if not exists user_artists (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

alter table user_artists enable row level security;

create policy "user_artists_select_own" on user_artists
  for select using (auth.uid() = user_id);

create policy "user_artists_insert_own" on user_artists
  for insert with check (auth.uid() = user_id);

create policy "user_artists_delete_own" on user_artists
  for delete using (auth.uid() = user_id);

create index if not exists idx_user_artists_user on user_artists(user_id);
create index if not exists idx_user_artists_artist on user_artists(artist_id);
;
