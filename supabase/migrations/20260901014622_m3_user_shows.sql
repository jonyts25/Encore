
-- M3 — Events: relación usuario-show (voy / fui / interesado)
create table if not exists user_shows (
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  status text not null check (status in ('interesado', 'voy', 'fui')),
  ticket_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

alter table user_shows enable row level security;

create policy "user_shows_select_own" on user_shows
  for select using (auth.uid() = user_id);

create policy "user_shows_insert_own" on user_shows
  for insert with check (auth.uid() = user_id);

create policy "user_shows_update_own" on user_shows
  for update using (auth.uid() = user_id);

create policy "user_shows_delete_own" on user_shows
  for delete using (auth.uid() = user_id);

create index if not exists idx_user_shows_user on user_shows(user_id);
create index if not exists idx_user_shows_show on user_shows(show_id);
;
