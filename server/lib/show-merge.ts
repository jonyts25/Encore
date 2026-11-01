import { createSupabaseAdminClient } from './supabase';
import { pickPreferredUserShowStatus, type UserShowStatus } from './show-merge-logic';

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export async function mergeShowIntoCanonical(
  supabase: SupabaseAdmin,
  fromShowId: string,
  toShowId: string
): Promise<void> {
  if (fromShowId === toShowId) return;

  const { data: userShowRows, error: userShowsError } = await supabase
    .from('user_shows')
    .select('user_id, show_id, status')
    .eq('show_id', fromShowId);

  if (userShowsError) throw userShowsError;

  for (const row of userShowRows ?? []) {
    const userId = row.user_id as string;
    const incomingStatus = row.status as UserShowStatus;

    const { data: existing, error: findError } = await supabase
      .from('user_shows')
      .select('status')
      .eq('user_id', userId)
      .eq('show_id', toShowId)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const mergedStatus = pickPreferredUserShowStatus(
        existing.status as UserShowStatus,
        incomingStatus
      );
      const { error: updateError } = await supabase
        .from('user_shows')
        .update({ status: mergedStatus, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('show_id', toShowId);
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('user_shows')
        .delete()
        .eq('user_id', userId)
        .eq('show_id', fromShowId);
      if (deleteError) throw deleteError;
    } else {
      const { error: moveError } = await supabase
        .from('user_shows')
        .update({ show_id: toShowId, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('show_id', fromShowId);
      if (moveError) throw moveError;
    }
  }

  const { data: memoryRows, error: memoriesError } = await supabase
    .from('memories')
    .select('user_id, show_id, rating, note, setlist_confirmed_at')
    .eq('show_id', fromShowId);

  if (memoriesError) throw memoriesError;

  for (const row of memoryRows ?? []) {
    const userId = row.user_id as string;

    const { data: existing, error: findError } = await supabase
      .from('memories')
      .select('id, rating, note, setlist_confirmed_at')
      .eq('user_id', userId)
      .eq('show_id', toShowId)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const keepIncoming =
        Boolean(row.setlist_confirmed_at) && !existing.setlist_confirmed_at;
      if (keepIncoming) {
        const { error: updateError } = await supabase
          .from('memories')
          .update({
            rating: row.rating ?? existing.rating,
            note: row.note ?? existing.note,
            setlist_confirmed_at: row.setlist_confirmed_at,
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      }
      await supabase.from('memories').delete().eq('user_id', userId).eq('show_id', fromShowId);
    } else {
      const { error: moveError } = await supabase
        .from('memories')
        .update({ show_id: toShowId })
        .eq('user_id', userId)
        .eq('show_id', fromShowId);
      if (moveError) throw moveError;
    }
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from('show_media')
    .select('id, user_id, asset_id')
    .eq('show_id', fromShowId);

  if (mediaError) throw mediaError;

  for (const row of mediaRows ?? []) {
    const { data: conflict, error: conflictError } = await supabase
      .from('show_media')
      .select('id')
      .eq('user_id', row.user_id as string)
      .eq('show_id', toShowId)
      .eq('asset_id', row.asset_id as string)
      .maybeSingle();

    if (conflictError) throw conflictError;

    if (conflict?.id) {
      await supabase.from('show_media').delete().eq('id', row.id);
    } else {
      const { error: moveError } = await supabase
        .from('show_media')
        .update({ show_id: toShowId })
        .eq('id', row.id);
      if (moveError) throw moveError;
    }
  }

  const { data: fromShow, error: fromShowError } = await supabase
    .from('shows')
    .select('tour_id, artist_id')
    .eq('id', fromShowId)
    .maybeSingle();

  if (fromShowError) throw fromShowError;

  if (fromShow?.tour_id) {
    const { data: toShow, error: toShowError } = await supabase
      .from('shows')
      .select('tour_id')
      .eq('id', toShowId)
      .maybeSingle();

    if (toShowError) throw toShowError;

    if (!toShow?.tour_id) {
      await supabase.from('shows').update({ tour_id: fromShow.tour_id }).eq('id', toShowId);
    }

    await supabase
      .from('community_playlists')
      .update({ tour_id: toShow?.tour_id ?? fromShow.tour_id })
      .eq('artist_id', fromShow.artist_id as string)
      .eq('tour_id', fromShow.tour_id as string);
  }

  await supabase.from('setlist_predictions').delete().eq('show_id', fromShowId);
  await supabase.from('show_songs').delete().eq('show_id', fromShowId);
  await supabase.from('shows').delete().eq('id', fromShowId);
}
