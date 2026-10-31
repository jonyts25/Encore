import { onlineManager } from '@tanstack/react-query';

import { supabase } from '@/core/api/supabase';
import {
  enqueueShowMediaPending,
  listShowMediaPendingWithIds,
  removeShowMediaPendingIds,
} from '@/core/db/showMediaQueue';

import type { ShowMediaInsertPayload, ShowMediaRow } from './showMediaTypes';

export type { ShowMediaInsertPayload, ShowMediaRow, ShowMediaSource, ShowMediaType } from './showMediaTypes';

let flushInFlight: Promise<void> | null = null;

export async function fetchShowMediaForShow(showId: string): Promise<ShowMediaRow[]> {
  const { data, error } = await supabase
    .from('show_media')
    .select(
      'id, user_id, show_id, asset_id, media_type, taken_at, song_id, source, created_at'
    )
    .eq('show_id', showId)
    .order('taken_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ShowMediaRow[];
}

async function insertShowMediaRow(
  userId: string,
  payload: ShowMediaInsertPayload
): Promise<ShowMediaRow | null> {
  const { data, error } = await supabase
    .from('show_media')
    .insert({
      user_id: userId,
      show_id: payload.show_id,
      asset_id: payload.asset_id,
      media_type: payload.media_type,
      taken_at: payload.taken_at,
      song_id: payload.song_id ?? null,
      source: payload.source,
    })
    .select(
      'id, user_id, show_id, asset_id, media_type, taken_at, song_id, source, created_at'
    )
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }
  return (data as ShowMediaRow | null) ?? null;
}

async function insertShowMediaRowsBatch(
  userId: string,
  payloads: ShowMediaInsertPayload[]
): Promise<void> {
  if (payloads.length === 0) return;

  const rows = payloads.map((payload) => ({
    user_id: userId,
    show_id: payload.show_id,
    asset_id: payload.asset_id,
    media_type: payload.media_type,
    taken_at: payload.taken_at,
    song_id: payload.song_id ?? null,
    source: payload.source,
  }));

  const { error } = await supabase.from('show_media').upsert(rows, {
    onConflict: 'user_id,show_id,asset_id',
    ignoreDuplicates: true,
  });

  if (error) throw error;
}

export async function insertShowMediaBatch(
  userId: string,
  payloads: ShowMediaInsertPayload[]
): Promise<ShowMediaRow[]> {
  if (payloads.length === 0) return [];

  await insertShowMediaRowsBatch(userId, payloads);

  const showId = payloads[0]?.show_id;
  if (!showId) return [];

  const assetIds = payloads.map((p) => p.asset_id);
  const { data, error } = await supabase
    .from('show_media')
    .select(
      'id, user_id, show_id, asset_id, media_type, taken_at, song_id, source, created_at'
    )
    .eq('user_id', userId)
    .eq('show_id', showId)
    .in('asset_id', assetIds);

  if (error) throw error;
  return (data ?? []) as ShowMediaRow[];
}

/** Persist media metadata; queues locally when offline or on network failure. */
export async function persistShowMediaBatch(
  userId: string | null | undefined,
  payloads: ShowMediaInsertPayload[]
): Promise<void> {
  if (!userId || payloads.length === 0) return;

  if (!onlineManager.isOnline()) {
    for (const payload of payloads) {
      await enqueueShowMediaPending(payload);
    }
    return;
  }

  try {
    await insertShowMediaRowsBatch(userId, payloads);
  } catch {
    for (const payload of payloads) {
      await enqueueShowMediaPending(payload);
    }
  }
}

export async function persistShowMedia(
  userId: string | null | undefined,
  payload: ShowMediaInsertPayload
): Promise<void> {
  if (!userId) return;

  if (!onlineManager.isOnline()) {
    await enqueueShowMediaPending(payload);
    return;
  }

  try {
    await insertShowMediaRow(userId, payload);
  } catch {
    await enqueueShowMediaPending(payload);
  }
}

export async function flushPendingShowMedia(userId: string | null | undefined): Promise<void> {
  if (!userId || !onlineManager.isOnline()) return;

  if (flushInFlight) {
    await flushInFlight;
    return;
  }

  flushInFlight = (async () => {
    const pending = await listShowMediaPendingWithIds();
    const succeededIds: string[] = [];

    for (const item of pending) {
      try {
        await insertShowMediaRow(userId, item.payload);
        succeededIds.push(item.id);
      } catch {
        break;
      }
    }

    if (succeededIds.length > 0) {
      await removeShowMediaPendingIds(succeededIds);
    }
  })();

  try {
    await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}
