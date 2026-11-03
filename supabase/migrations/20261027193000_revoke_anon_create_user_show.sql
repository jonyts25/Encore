
-- Harden RPC grants: create_user_show must not be callable by anon/public.

revoke all on function public.create_user_show(
  uuid, date, uuid, text, text, text, time, boolean, uuid, boolean
) from public;

revoke all on function public.create_user_show(
  uuid, date, uuid, text, text, text, time, boolean, uuid, boolean
) from anon;

grant execute on function public.create_user_show(
  uuid, date, uuid, text, text, text, time, boolean, uuid, boolean
) to authenticated;

-- Belt-and-suspenders for other SECURITY DEFINER RPCs in public.
revoke all on function public.add_user_song(uuid, text) from public;
revoke all on function public.add_user_song(uuid, text) from anon;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;

revoke all on function public.admin_upsert_festival(jsonb) from public;
revoke all on function public.admin_upsert_festival(jsonb) from anon;
