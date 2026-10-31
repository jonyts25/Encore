-- Concert night media: local iOS asset identifiers only (no file upload).

create table if not exists public.show_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  show_id uuid not null references public.shows (id) on delete cascade,
  asset_id text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  taken_at timestamptz not null,
  song_id uuid references public.songs (id) on delete set null,
  source text not null check (source in ('live', 'library')),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_show_media_user_show_asset
  on public.show_media (user_id, show_id, asset_id);

create index if not exists idx_show_media_user_show
  on public.show_media (user_id, show_id, taken_at desc);

alter table public.show_media enable row level security;

create policy "show_media_select_own" on public.show_media
  for select using (auth.uid() = user_id);

create policy "show_media_insert_own" on public.show_media
  for insert with check (auth.uid() = user_id);

create policy "show_media_delete_own" on public.show_media
  for delete using (auth.uid() = user_id);
