-- Nearby venue search for user-created shows (haversine, no PostGIS).

create or replace function public.search_venues_nearby(
  p_query text,
  p_lat double precision,
  p_lng double precision,
  p_city text default null,
  p_radius_km double precision default 75,
  p_limit int default 20
)
returns table (
  id uuid,
  name text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select
      public.normalize_venue_name(coalesce(p_query, '')) as q,
      nullif(trim(coalesce(p_city, '')), '') as city_filter
  ),
  scored as (
    select
      v.id,
      v.name,
      v.city,
      v.country,
      v.lat,
      v.lng,
      case
        when v.lat is not null and v.lng is not null and p_lat is not null and p_lng is not null then
          6371.0 * acos(
            least(
              1.0,
              greatest(
                -1.0,
                cos(radians(p_lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(p_lng))
                + sin(radians(p_lat)) * sin(radians(v.lat))
              )
            )
          )
        else null
      end as distance_km,
      case
        when (select q from params) = '' then 1.0
        else greatest(
          similarity(v.name_normalized, (select q from params)),
          case
            when v.name_normalized like '%' || (select q from params) || '%' then 0.5
            else 0.0
          end
        )
      end as name_score
    from venues v
    where
      (
        (select q from params) = ''
        or v.name_normalized like '%' || (select q from params) || '%'
        or similarity(v.name_normalized, (select q from params)) >= 0.15
      )
      and (
        (
          v.lat is not null
          and v.lng is not null
          and p_lat is not null
          and p_lng is not null
          and (
            6371.0 * acos(
              least(
                1.0,
                greatest(
                  -1.0,
                  cos(radians(p_lat)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians(p_lng))
                  + sin(radians(p_lat)) * sin(radians(v.lat))
                )
              )
            )
          ) <= p_radius_km
        )
        or (
          (v.lat is null or v.lng is null)
          and (select city_filter from params) is not null
          and lower(trim(v.city)) = lower((select city_filter from params))
        )
        or (
          p_lat is null
          and p_lng is null
          and (select city_filter from params) is not null
          and lower(trim(v.city)) = lower((select city_filter from params))
        )
      )
  )
  select
    s.id,
    s.name,
    s.city,
    s.country,
    s.lat,
    s.lng,
    s.distance_km
  from scored s
  order by
    case when s.lat is null or s.lng is null then 1 else 0 end,
    s.name_score desc,
    s.distance_km asc nulls last,
    s.name asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.search_venues_nearby(
  text,
  double precision,
  double precision,
  text,
  double precision,
  int
) to authenticated, anon;
