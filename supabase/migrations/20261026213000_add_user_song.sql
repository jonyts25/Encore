-- User-added catalog songs: normalized titles, source, and SECURITY DEFINER RPC.

create or replace function public.normalize_song_title(input text)
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

alter table songs
  add column if not exists title_normalized text,
  add column if not exists source text not null default 'setlistfm',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table songs drop constraint if exists songs_source_check;
alter table songs
  add constraint songs_source_check
  check (source in ('setlistfm', 'user', 'ticketmaster', 'musicbrainz'));

update songs
set title_normalized = public.normalize_song_title(title)
where title_normalized is null or title_normalized = '';

update songs
set source = coalesce(source, 'setlistfm')
where source is null or source = '';

-- Resolve duplicate (artist, title_normalized) before unique index.
with ranked as (
  select
    id,
    row_number() over (
      partition by artist_id, title_normalized
      order by created_at asc, id asc
    ) as rn
  from songs
  where title_normalized is not null
    and title_normalized <> ''
)
delete from songs s
using ranked r
where s.id = r.id
  and r.rn > 1;

alter table songs
  alter column title_normalized set not null;

create unique index if not exists idx_songs_artist_title_normalized
  on songs (artist_id, title_normalized);

create or replace function public.songs_set_title_normalized()
returns trigger
language plpgsql
as $$
begin
  new.title_normalized := public.normalize_song_title(new.title);
  return new;
end;
$$;

drop trigger if exists trg_songs_set_title_normalized on songs;
create trigger trg_songs_set_title_normalized
before insert or update of title on songs
for each row execute function public.songs_set_title_normalized();

create or replace function public.add_user_song(
  p_artist_id uuid,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_normalized text;
  v_existing songs%rowtype;
  v_song songs%rowtype;
  v_today date;
  v_created_today integer;
  v_daily_limit constant integer := 30;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  if p_artist_id is null or v_title = '' then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  v_normalized := public.normalize_song_title(v_title);

  select * into v_existing
  from songs
  where artist_id = p_artist_id
    and title_normalized = v_normalized
  limit 1;

  if found then
    return jsonb_build_object(
      'result', 'existing',
      'song', jsonb_build_object(
        'id', v_existing.id,
        'artist_id', v_existing.artist_id,
        'title', v_existing.title,
        'source', v_existing.source
      )
    );
  end if;

  v_today := (timezone('America/Mexico_City', now()))::date;
  select count(*)::integer
  into v_created_today
  from songs
  where created_by = v_user_id
    and source = 'user'
    and (timezone('America/Mexico_City', created_at))::date = v_today;

  if v_created_today >= v_daily_limit then
    return jsonb_build_object(
      'result', 'daily_limit',
      'created_today', v_created_today,
      'limit', v_daily_limit
    );
  end if;

  insert into songs (artist_id, title, title_normalized, source, created_by)
  values (p_artist_id, v_title, v_normalized, 'user', v_user_id)
  returning * into v_song;

  return jsonb_build_object(
    'result', 'created',
    'song', jsonb_build_object(
      'id', v_song.id,
      'artist_id', v_song.artist_id,
      'title', v_song.title,
      'source', v_song.source
    )
  );
exception
  when unique_violation then
    select * into v_existing
    from songs
    where artist_id = p_artist_id
      and title_normalized = v_normalized
    limit 1;

    if found then
      return jsonb_build_object(
        'result', 'existing',
        'song', jsonb_build_object(
          'id', v_existing.id,
          'artist_id', v_existing.artist_id,
          'title', v_existing.title,
          'source', v_existing.source
        )
      );
    end if;
    raise;
end;
$$;

revoke all on function public.add_user_song(uuid, text) from public;
revoke all on function public.add_user_song(uuid, text) from anon;
grant execute on function public.add_user_song(uuid, text) to authenticated;
grant execute on function public.add_user_song(uuid, text) to service_role;
