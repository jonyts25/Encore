-- Community-curated tour playlists (Apple Music, Spotify, YouTube Music).

create table if not exists public.community_playlists (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references public.tours (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  url text not null,
  service text not null check (service in ('apple_music', 'spotify', 'youtube_music')),
  title text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_community_playlists_artist_tour_url
  on public.community_playlists (artist_id, tour_id, url) nulls not distinct;

create index if not exists idx_community_playlists_artist_tour
  on public.community_playlists (artist_id, tour_id);

create table if not exists public.community_playlist_uses (
  playlist_id uuid not null references public.community_playlists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (playlist_id, user_id)
);

create index if not exists idx_community_playlist_uses_playlist
  on public.community_playlist_uses (playlist_id);

alter table public.community_playlists enable row level security;
alter table public.community_playlist_uses enable row level security;

create policy "community_playlists_select_authenticated"
  on public.community_playlists
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "community_playlists_insert_own"
  on public.community_playlists
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "community_playlists_delete_own"
  on public.community_playlists
  for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "community_playlist_uses_insert_own"
  on public.community_playlist_uses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "community_playlist_uses_select_own"
  on public.community_playlist_uses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "community_playlist_uses_delete_own"
  on public.community_playlist_uses
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.get_public_display_names(p_user_ids uuid[])
returns table (
  user_id uuid,
  display_name text
)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.display_name
  from public.profiles p
  where p.user_id = any (p_user_ids);
$$;

revoke all on function public.get_public_display_names(uuid[]) from public;
revoke all on function public.get_public_display_names(uuid[]) from anon;
grant execute on function public.get_public_display_names(uuid[]) to authenticated;

create or replace function public.get_playlist_use_counts(p_playlist_ids uuid[])
returns table (
  playlist_id uuid,
  use_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    cpu.playlist_id,
    count(*)::bigint as use_count
  from public.community_playlist_uses cpu
  where cpu.playlist_id = any (p_playlist_ids)
  group by cpu.playlist_id;
$$;

revoke all on function public.get_playlist_use_counts(uuid[]) from public;
revoke all on function public.get_playlist_use_counts(uuid[]) from anon;
grant execute on function public.get_playlist_use_counts(uuid[]) to authenticated;

grant select, insert, delete on public.community_playlists to authenticated;
grant select, insert, delete on public.community_playlist_uses to authenticated;
