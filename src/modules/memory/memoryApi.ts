import { onlineManager } from '@tanstack/react-query';

import { supabase } from '@/core/api/supabase';
import {
  enqueueMemoryPending,
  listMemoryPendingWithIds,
  removeMemoryPendingIds,
} from '@/core/db/memoryQueue';

import type { MemoryRow, MemorySavePayload, MemorySongWithTitle, ShowMemory } from './types';

const MEMORY_SELECT = `
  id,
  user_id,
  show_id,
  rating,
  note,
  setlist_confirmed_at,
  created_at,
  updated_at
`;

const MEMORY_SONGS_SELECT = `
  id,
  memory_id,
  song_id,
  position,
  is_encore,
  is_highlight,
  song:songs (
    title
  )
`;

let flushInFlight: Promise<void> | null = null;

type MemorySongRowFromDb = {
  id: string;
  memory_id: string;
  song_id: string;
  position: number;
  is_encore: boolean;
  is_highlight: boolean;
  song: { title: string } | { title: string }[] | null;
};

function normalizeMemorySongs(rows: MemorySongRowFromDb[]): MemorySongWithTitle[] {
  return rows.map((row) => {
    const song = Array.isArray(row.song) ? row.song[0] : row.song;
    return {
      id: row.id,
      memory_id: row.memory_id,
      song_id: row.song_id,
      position: row.position,
      is_encore: row.is_encore,
      is_highlight: row.is_highlight,
      title: song?.title ?? '',
    };
  });
}

export async function getMemoryForShow(
  userId: string,
  showId: string
): Promise<ShowMemory | null> {
  const { data: memory, error } = await supabase
    .from('memories')
    .select(MEMORY_SELECT)
    .eq('user_id', userId)
    .eq('show_id', showId)
    .maybeSingle();

  if (error) throw error;
  if (!memory) return null;

  const { data: songs, error: songsError } = await supabase
    .from('memory_songs')
    .select(MEMORY_SONGS_SELECT)
    .eq('memory_id', memory.id)
    .order('position', { ascending: true });

  if (songsError) throw songsError;

  return {
    ...(memory as ShowMemory),
    songs: normalizeMemorySongs((songs ?? []) as MemorySongRowFromDb[]),
  };
}

export async function listMemoriesForYear(userId: string, year: number): Promise<ShowMemory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select(`${MEMORY_SELECT}, show:shows ( show_date, local_date )`)
    .eq('user_id', userId);

  if (error) throw error;

  const rows = (data ?? []) as Array<
    MemoryRow & {
      show: { show_date: string; local_date: string | null } | { show_date: string; local_date: string | null }[] | null;
    }
  >;

  const showIdsInYear = rows
    .filter((row) => {
      const showRel = Array.isArray(row.show) ? row.show[0] : row.show;
      const showDate = showRel?.local_date ?? showRel?.show_date?.slice(0, 10);
      if (!showDate) return false;
      return Number(showDate.slice(0, 4)) === year;
    })
    .map((row) => row.show_id);

  const memories: ShowMemory[] = [];
  for (const showId of showIdsInYear) {
    const memory = await getMemoryForShow(userId, showId);
    if (memory) memories.push(memory);
  }
  return memories;
}

async function persistMemoryOnline(userId: string, payload: MemorySavePayload): Promise<void> {
  const now = new Date().toISOString();
  const { data: memory, error } = await supabase
    .from('memories')
    .upsert(
      {
        user_id: userId,
        show_id: payload.show_id,
        rating: payload.rating,
        note: payload.note,
        setlist_confirmed_at: payload.setlist_confirmed_at,
        updated_at: now,
      },
      { onConflict: 'user_id,show_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  const memoryId = memory.id as string;

  const { error: deleteError } = await supabase.from('memory_songs').delete().eq('memory_id', memoryId);
  if (deleteError) throw deleteError;

  if (payload.songs.length === 0) return;

  const { error: insertError } = await supabase.from('memory_songs').insert(
    payload.songs.map((song) => ({
      memory_id: memoryId,
      song_id: song.song_id,
      position: song.position,
      is_encore: song.is_encore,
      is_highlight: song.is_highlight,
    }))
  );

  if (insertError) throw insertError;
}

export async function persistShowMemory(
  userId: string | null | undefined,
  payload: MemorySavePayload
): Promise<void> {
  if (!userId) return;

  if (!onlineManager.isOnline()) {
    await enqueueMemoryPending(payload);
    return;
  }

  try {
    await persistMemoryOnline(userId, payload);
  } catch {
    await enqueueMemoryPending(payload);
  }
}

export async function flushPendingMemories(userId: string | null | undefined): Promise<void> {
  if (!userId || !onlineManager.isOnline()) return;

  if (flushInFlight) {
    await flushInFlight;
    return;
  }

  flushInFlight = (async () => {
    const pending = await listMemoryPendingWithIds();
    const succeededIds: string[] = [];

    for (const item of pending) {
      try {
        await persistMemoryOnline(userId, item.payload);
        succeededIds.push(item.id);
      } catch {
        break;
      }
    }

    if (succeededIds.length > 0) {
      await removeMemoryPendingIds(succeededIds);
    }
  })();

  try {
    await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

export async function fetchShowSongsForPrefill(showId: string): Promise<
  { song_id: string; title: string; position: number | null; is_encore: boolean }[]
> {
  const { data, error } = await supabase
    .from('show_songs')
    .select('song_id, position, is_encore, song:songs ( title )')
    .eq('show_id', showId)
    .order('position', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const song = Array.isArray(row.song) ? row.song[0] : row.song;
    return {
      song_id: row.song_id as string,
      title: (song as { title: string } | null)?.title ?? '',
      position: row.position as number | null,
      is_encore: Boolean(row.is_encore),
    };
  });
}
