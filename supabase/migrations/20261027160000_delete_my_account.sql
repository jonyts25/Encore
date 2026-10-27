
-- Account self-deletion (authenticated users only).
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

  delete from public.user_shows where user_id = v_user_id;
  delete from public.user_artists where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
