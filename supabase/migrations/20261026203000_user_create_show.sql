-- User-created shows: schema, dedupe guard, and SECURITY DEFINER RPC.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_venue_name(input text)
returns text
language sql
immutable
as $$
  select lower(
    trim(
      regexp_replace(
        extensions.unaccent(coalesce(input, '')),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

alter table venues
  add column if not exists timezone text not null default 'America/Mexico_City',
  add column if not exists name_normalized text;

update venues
set name_normalized = public.normalize_venue_name(name)
where name_normalized is null or name_normalized = '';

alter table venues
  alter column name_normalized set not null;

create index if not exists idx_venues_name_normalized_trgm
  on venues using gin (name_normalized gin_trgm_ops);

create index if not exists idx_venues_city_country on venues (city, country);

create or replace function public.venues_set_name_normalized()
returns trigger
language plpgsql
as $$
begin
  new.name_normalized := public.normalize_venue_name(new.name);
  return new;
end;
$$;

drop trigger if exists trg_venues_set_name_normalized on venues;
create trigger trg_venues_set_name_normalized
before insert or update of name on venues
for each row execute function public.venues_set_name_normalized();

alter table shows
  add column if not exists local_date date,
  add column if not exists time_confirmed boolean not null default true,
  add column if not exists source text not null default 'setlistfm',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table shows drop constraint if exists shows_source_check;
alter table shows
  add constraint shows_source_check
  check (source in ('setlistfm', 'user', 'ticketmaster'));

update shows s
set local_date = (s.show_date at time zone coalesce(v.timezone, 'America/Mexico_City'))::date
from venues v
where v.id = s.venue_id
  and s.local_date is null;

update shows
set local_date = (show_date at time zone 'America/Mexico_City')::date
where local_date is null;

update shows
set source = case when setlistfm_id is not null then 'setlistfm' else coalesce(source, 'setlistfm') end
where source is null or source = '';

-- Resolve duplicate (artist, venue, local_date) before unique index.
with ranked as (
  select
    id,
    row_number() over (
      partition by artist_id, venue_id, local_date
      order by created_at asc, id asc
    ) as rn
  from shows
  where venue_id is not null
    and local_date is not null
)
delete from shows s
using ranked r
where s.id = r.id
  and r.rn > 1;

alter table shows
  alter column local_date set not null;

create unique index if not exists idx_shows_artist_venue_local_date
  on shows (artist_id, venue_id, local_date);

create table if not exists external_ids (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('artist', 'venue', 'show')),
  entity_id uuid not null,
  source text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists idx_external_ids_entity on external_ids (entity_type, entity_id);

alter table external_ids enable row level security;
create policy "external_ids_public_read" on external_ids for select using (true);

create or replace function public.create_user_show(
  p_artist_id uuid,
  p_local_date date,
  p_venue_id uuid default null,
  p_venue_name text default null,
  p_venue_city text default null,
  p_venue_country text default 'MX',
  p_local_time time default null,
  p_time_confirmed boolean default true,
  p_confirm_venue_id uuid default null,
  p_force_create_venue boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_venue_id uuid;
  v_venue venues%rowtype;
  v_show_id uuid;
  v_show shows%rowtype;
  v_show_date timestamptz;
  v_today date;
  v_created_today integer;
  v_normalized_name text;
  v_candidates jsonb;
  v_similarity_threshold constant double precision := 0.35;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  if p_artist_id is null or p_local_date is null then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  v_today := (timezone('America/Mexico_City', now()))::date;
  select count(*)::integer
  into v_created_today
  from shows
  where created_by = v_user_id
    and source = 'user'
    and (timezone('America/Mexico_City', created_at))::date = v_today;

  if v_created_today >= 5 then
    return jsonb_build_object(
      'result', 'daily_limit',
      'created_today', v_created_today,
      'limit', 5
    );
  end if;

  if p_confirm_venue_id is not null then
    v_venue_id := p_confirm_venue_id;
  elsif p_venue_id is not null then
    v_venue_id := p_venue_id;
  elsif coalesce(trim(p_venue_name), '') <> '' and coalesce(trim(p_venue_city), '') <> '' then
    v_normalized_name := public.normalize_venue_name(p_venue_name);

    select coalesce(jsonb_agg(to_jsonb(row)), '[]'::jsonb)
    into v_candidates
    from (
      select
        v.id,
        v.name,
        v.city,
        v.country,
        similarity(v.name_normalized, v_normalized_name) as score
      from venues v
      where lower(coalesce(v.city, '')) = lower(trim(p_venue_city))
        and similarity(v.name_normalized, v_normalized_name) >= v_similarity_threshold
      order by score desc
      limit 5
    ) row;

    if jsonb_array_length(v_candidates) > 0 and not p_force_create_venue then
      return jsonb_build_object(
        'result', 'venue_candidates',
        'candidates', v_candidates
      );
    end if;

    insert into venues (name, city, country, timezone, name_normalized)
    values (
      trim(p_venue_name),
      trim(p_venue_city),
      coalesce(nullif(trim(p_venue_country), ''), 'MX'),
      'America/Mexico_City',
      v_normalized_name
    )
    returning id into v_venue_id;
  else
    raise exception 'VENUE_REQUIRED' using errcode = '22023';
  end if;

  select * into v_venue from venues where id = v_venue_id;
  if not found then
    raise exception 'VENUE_NOT_FOUND' using errcode = '22023';
  end if;

  v_show_date := (
    (p_local_date::text || ' ' || coalesce(p_local_time::text, '20:00:00'))::timestamp
    at time zone coalesce(v_venue.timezone, 'America/Mexico_City')
  );

  select id into v_show_id
  from shows
  where artist_id = p_artist_id
    and venue_id = v_venue_id
    and local_date = p_local_date
  limit 1;

  if v_show_id is not null then
    insert into user_shows (user_id, show_id, status, updated_at)
    values (v_user_id, v_show_id, 'voy', now())
    on conflict (user_id, show_id)
    do update set status = 'voy', updated_at = now();

    select * into v_show from shows where id = v_show_id;

    return jsonb_build_object(
      'result', 'existing',
      'show_id', v_show_id,
      'show', to_jsonb(v_show)
    );
  end if;

  insert into shows (
    artist_id,
    venue_id,
    show_date,
    local_date,
    time_confirmed,
    source,
    created_by
  )
  values (
    p_artist_id,
    v_venue_id,
    v_show_date,
    p_local_date,
    coalesce(p_time_confirmed, true),
    'user',
    v_user_id
  )
  returning id into v_show_id;

  insert into user_shows (user_id, show_id, status, updated_at)
  values (v_user_id, v_show_id, 'voy', now())
  on conflict (user_id, show_id)
  do update set status = 'voy', updated_at = now();

  select * into v_show from shows where id = v_show_id;

  return jsonb_build_object(
    'result', 'created',
    'show_id', v_show_id,
    'show', to_jsonb(v_show)
  );
end;
$$;

revoke all on function public.create_user_show(
  uuid, date, uuid, text, text, text, time, boolean, uuid, boolean
) from public;

grant execute on function public.create_user_show(
  uuid, date, uuid, text, text, text, time, boolean, uuid, boolean
) to authenticated;
