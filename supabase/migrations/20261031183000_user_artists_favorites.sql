-- Favorite artists (max 10 per user).

alter table public.user_artists
  add column if not exists is_favorite boolean not null default false,
  add column if not exists favorited_at timestamptz;

create index if not exists idx_user_artists_favorites
  on public.user_artists (user_id, favorited_at desc nulls last)
  where is_favorite = true;

drop policy if exists "user_artists_update_own" on public.user_artists;
create policy "user_artists_update_own" on public.user_artists
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.enforce_user_artists_favorite_limit()
returns trigger
language plpgsql
as $$
declare
  favorite_count integer;
begin
  if coalesce(NEW.is_favorite, false) = false then
    NEW.favorited_at := null;
    return NEW;
  end if;

  select count(*)::integer
  into favorite_count
  from public.user_artists
  where user_id = NEW.user_id
    and is_favorite = true
    and artist_id is distinct from NEW.artist_id;

  if favorite_count >= 10 then
    raise exception 'favorite_artists_limit'
      using errcode = 'P0001';
  end if;

  if NEW.favorited_at is null then
    NEW.favorited_at := now();
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_user_artists_favorite_limit on public.user_artists;
create trigger trg_user_artists_favorite_limit
before insert or update of is_favorite, favorited_at on public.user_artists
for each row
execute function public.enforce_user_artists_favorite_limit();
