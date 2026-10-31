import 'expo-sqlite/localStorage/install';

import type { MusicStreamingService } from './streamingLinks';
import { MUSIC_STREAMING_SERVICES } from './streamingLinks';

const STORAGE_KEY = 'encore.musicStreaming.preferredService';

export function readPreferredMusicService(): MusicStreamingService | null {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (MUSIC_STREAMING_SERVICES.includes(raw as MusicStreamingService)) {
      return raw as MusicStreamingService;
    }
    return null;
  } catch {
    return null;
  }
}

export function writePreferredMusicService(service: MusicStreamingService): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, service);
  } catch {
    // ignore storage failures
  }
}
