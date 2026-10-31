-- User-confirmed setlists and concert ratings (memories).

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  show_id uuid not null references public.shows (id) on delete cascade,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  note text,
  setlist_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_memories_user_show on public.memories (user_id, show_id);

create index if not exists idx_memories_user_id on public.memories (user_id);

create table if not exists public.memory_songs (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null,
  is_encore boolean not null default false,
  is_highlight boolean not null default false
);

create unique index if not exists idx_memory_songs_memory_song on public.memory_songs (memory_id, song_id);

create index if not exists idx_memory_songs_memory_position on public.memory_songs (memory_id, position);

alter table public.memories enable row level security;
alter table public.memory_songs enable row level security;

create policy "memories_select_own" on public.memories
  for select using (auth.uid() = user_id);

create policy "memories_insert_own" on public.memories
  for insert with check (auth.uid() = user_id);

create policy "memories_update_own" on public.memories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "memories_delete_own" on public.memories
  for delete using (auth.uid() = user_id);

create policy "memory_songs_select_own" on public.memory_songs
  for select using (
    exists (
      select 1 from public.memories m
      where m.id = memory_songs.memory_id and m.user_id = auth.uid()
    )
  );

create policy "memory_songs_insert_own" on public.memory_songs
  for insert with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_songs.memory_id and m.user_id = auth.uid()
    )
  );

create policy "memory_songs_update_own" on public.memory_songs
  for update using (
    exists (
      select 1 from public.memories m
      where m.id = memory_songs.memory_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_songs.memory_id and m.user_id = auth.uid()
    )
  );

create policy "memory_songs_delete_own" on public.memory_songs
  for delete using (
    exists (
      select 1 from public.memories m
      where m.id = memory_songs.memory_id and m.user_id = auth.uid()
    )
  );
