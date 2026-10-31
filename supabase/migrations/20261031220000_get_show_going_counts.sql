-- Aggregate going/interested counts per show (no user identities exposed).

create or replace function public.get_show_going_counts(p_show_ids uuid[])
returns table (
  show_id uuid,
  going_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    us.show_id,
    count(distinct us.user_id)::bigint as going_count
  from public.user_shows us
  where us.show_id = any (p_show_ids)
    and us.status in ('voy', 'interesado')
  group by us.show_id;
$$;

revoke all on function public.get_show_going_counts(uuid[]) from public;
revoke all on function public.get_show_going_counts(uuid[]) from anon;
grant execute on function public.get_show_going_counts(uuid[]) to authenticated;
