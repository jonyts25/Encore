
-- Festivals: container for normal shows + user festival attendance.

create table if not exists public.festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition_year integer not null,
  venue_id uuid not null references public.venues(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  source text not null check (source in ('admin', 'ticketmaster')),
  created_at timestamptz not null default now(),
  unique (name, edition_year, venue_id)
);

create index if not exists idx_festivals_venue on public.festivals(venue_id);
create index if not exists idx_festivals_dates on public.festivals(start_date, end_date);

alter table public.festivals enable row level security;

create policy "festivals_public_read" on public.festivals
  for select using (true);

alter table public.shows
  add column if not exists festival_id uuid references public.festivals(id) on delete set null,
  add column if not exists stage text,
  add column if not exists set_start timestamptz,
  add column if not exists set_end timestamptz,
  add column if not exists set_duration_min integer;

create index if not exists idx_shows_festival on public.shows(festival_id);

alter table public.shows drop constraint if exists shows_source_check;
alter table public.shows
  add constraint shows_source_check
  check (source in ('setlistfm', 'user', 'ticketmaster', 'festival'));

create table if not exists public.user_festivals (
  user_id uuid not null references auth.users(id) on delete cascade,
  festival_id uuid not null references public.festivals(id) on delete cascade,
  status text not null check (status in ('voy', 'interesado')),
  days date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

alter table public.user_festivals enable row level security;

create policy "user_festivals_select_own" on public.user_festivals
  for select using (auth.uid() = user_id);

create policy "user_festivals_insert_own" on public.user_festivals
  for insert with check (auth.uid() = user_id);

create policy "user_festivals_update_own" on public.user_festivals
  for update using (auth.uid() = user_id);

create policy "user_festivals_delete_own" on public.user_festivals
  for delete using (auth.uid() = user_id);

create index if not exists idx_user_festivals_user on public.user_festivals(user_id);
create index if not exists idx_user_festivals_festival on public.user_festivals(festival_id);

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.shows set created_by = null where created_by = v_user_id;
  update public.songs set created_by = null where created_by = v_user_id;

  delete from public.user_festivals where user_id = v_user_id;
  delete from public.user_shows where user_id = v_user_id;
  delete from public.user_artists where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

create or replace function public.admin_upsert_festival(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_venue_id uuid;
  v_venue_tz text;
  v_festival_id uuid;
  v_festival_name text;
  v_edition_year integer;
  v_start_date date;
  v_end_date date;
  v_lineup jsonb;
  v_item jsonb;
  v_artist_name text;
  v_artist_id uuid;
  v_day date;
  v_stage text;
  v_start_time time;
  v_end_time time;
  v_set_start timestamptz;
  v_set_end timestamptz;
  v_show_date timestamptz;
  v_duration_min integer;
  v_time_confirmed boolean;
  v_missing text[] := '{}';
  v_shows_created integer := 0;
  v_shows_updated integer := 0;
  v_existing_id uuid;
  v_inserted boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where user_id = v_user_id;
  if v_role is distinct from 'admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_festival_name := trim(coalesce(p_payload->>'name', ''));
  v_edition_year := (p_payload->>'edition_year')::integer;
  v_start_date := (p_payload->>'start_date')::date;
  v_end_date := (p_payload->>'end_date')::date;
  v_lineup := coalesce(p_payload->'lineup', '[]'::jsonb);

  if v_festival_name = '' or v_edition_year is null or v_start_date is null or v_end_date is null then
    raise exception 'INVALID_PAYLOAD' using errcode = '22023';
  end if;

  if p_payload->'venue' is null then
    raise exception 'VENUE_REQUIRED' using errcode = '22023';
  end if;

  select v.id, coalesce(v.timezone, 'America/Mexico_City')
  into v_venue_id, v_venue_tz
  from public.venues v
  where lower(trim(coalesce(v.city, ''))) = lower(trim(coalesce(p_payload->'venue'->>'city', '')))
    and public.normalize_venue_name(v.name) = public.normalize_venue_name(p_payload->'venue'->>'name')
  limit 1;

  if v_venue_id is null then
    insert into public.venues (name, city, country, timezone, name_normalized)
    values (
      trim(p_payload->'venue'->>'name'),
      trim(p_payload->'venue'->>'city'),
      coalesce(nullif(trim(p_payload->'venue'->>'country'), ''), 'MX'),
      coalesce(nullif(trim(p_payload->'venue'->>'timezone'), ''), 'America/Mexico_City'),
      public.normalize_venue_name(p_payload->'venue'->>'name')
    )
    returning id, coalesce(timezone, 'America/Mexico_City') into v_venue_id, v_venue_tz;
  end if;

  insert into public.festivals (name, edition_year, venue_id, start_date, end_date, source)
  values (v_festival_name, v_edition_year, v_venue_id, v_start_date, v_end_date, 'admin')
  on conflict (name, edition_year, venue_id)
  do update set
    start_date = excluded.start_date,
    end_date = excluded.end_date
  returning id into v_festival_id;

  for v_item in select value from jsonb_array_elements(v_lineup)
  loop
    v_artist_name := trim(coalesce(v_item->>'artist', ''));
    if v_artist_name = '' then
      continue;
    end if;

    v_day := (v_item->>'day')::date;
    if v_day is null then
      continue;
    end if;

    select a.id into v_artist_id
    from public.artists a
    where lower(trim(a.name)) = lower(v_artist_name)
    order by a.created_at asc
    limit 1;

    if v_artist_id is null then
      select a.id into v_artist_id
      from public.artists a
      where a.name ilike v_artist_name
      order by a.created_at asc
      limit 1;
    end if;

    if v_artist_id is null then
      v_missing := array_append(v_missing, v_artist_name);
      continue;
    end if;

    v_stage := nullif(trim(coalesce(v_item->>'stage', '')), '');
    v_start_time := nullif(trim(coalesce(v_item->>'start', '')), '')::time;
    v_end_time := nullif(trim(coalesce(v_item->>'end', '')), '')::time;

    v_set_start := null;
    v_set_end := null;
    v_duration_min := null;
    v_time_confirmed := v_start_time is not null;

    if v_start_time is not null then
      v_set_start := ((v_day::text || ' ' || v_start_time::text)::timestamp at time zone v_venue_tz);
      v_show_date := v_set_start;
    else
      v_show_date := ((v_day::text || ' 20:00:00')::timestamp at time zone v_venue_tz);
    end if;

    if v_end_time is not null then
      v_set_end := ((v_day::text || ' ' || v_end_time::text)::timestamp at time zone v_venue_tz);
      if v_set_start is not null and v_set_end > v_set_start then
        v_duration_min := (extract(epoch from (v_set_end - v_set_start)) / 60)::integer;
      end if;
    end if;

    v_existing_id := null;
    select s.id into v_existing_id
    from public.shows s
    where s.artist_id = v_artist_id
      and s.venue_id = v_venue_id
      and s.local_date = v_day
    limit 1;

    v_inserted := v_existing_id is null;

    insert into public.shows (
      artist_id,
      venue_id,
      show_date,
      local_date,
      time_confirmed,
      source,
      festival_id,
      stage,
      set_start,
      set_end,
      set_duration_min
    )
    values (
      v_artist_id,
      v_venue_id,
      v_show_date,
      v_day,
      v_time_confirmed,
      'festival',
      v_festival_id,
      v_stage,
      v_set_start,
      v_set_end,
      v_duration_min
    )
    on conflict (artist_id, venue_id, local_date)
    do update set
      festival_id = excluded.festival_id,
      stage = coalesce(excluded.stage, public.shows.stage),
      set_start = coalesce(excluded.set_start, public.shows.set_start),
      set_end = coalesce(excluded.set_end, public.shows.set_end),
      set_duration_min = coalesce(excluded.set_duration_min, public.shows.set_duration_min),
      show_date = case
        when excluded.time_confirmed then excluded.show_date
        else public.shows.show_date
      end,
      time_confirmed = public.shows.time_confirmed or excluded.time_confirmed
    returning id into v_existing_id;

    if v_inserted then
      v_shows_created := v_shows_created + 1;
    else
      v_shows_updated := v_shows_updated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'festival_id', v_festival_id,
    'shows_created', v_shows_created,
    'shows_updated', v_shows_updated,
    'missing_artists', to_jsonb(v_missing)
  );
end;
$$;

revoke all on function public.admin_upsert_festival(jsonb) from public;
revoke all on function public.admin_upsert_festival(jsonb) from anon;
grant execute on function public.admin_upsert_festival(jsonb) to authenticated;
