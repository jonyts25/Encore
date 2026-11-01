import { useCallback, useMemo } from 'react';
import { Alert, Linking } from 'react-native';

import { useTranslation } from '@/core/i18n';

import { resolveAppleMusicArtistUrl, resolveAppleMusicSongUrl } from './appleMusicItunes';
import { fetchMusicLinksByAppleUrl } from './musicLinksApi';
import {
  readPreferredMusicService,
  writePreferredMusicService,
} from './musicServicePreference';
import { resolveAppleMusicSetlistUrl } from './openAppleMusicSetlist';
import {
  buildStreamingSearchUrl,
  buildYouTubeMusicDeepLink,
  buildYouTubeMusicSearchUrl,
  orderStreamingServices,
  type MusicStreamingService,
} from './streamingLinks';

const SERVICE_I18N_KEY: Record<MusicStreamingService, string> = {
  apple_music: 'musicStreaming.appleMusic',
  spotify: 'musicStreaming.spotify',
  youtube_music: 'musicStreaming.youtubeMusic',
};

export type OpenMusicSearchOptions = {
  dialogTitle?: string;
  intent?: 'song' | 'setlist';
  /** When true with setlist intent, Apple Music opens the artist page instead of a playlist. */
  appleMusicArtistPage?: boolean;
  artistName?: string;
  songTitle?: string;
  artistId?: string | null;
  tourId?: string | null;
  onResolveStart?: () => void;
  onResolveEnd?: () => void;
};

function showOpenError(t: (key: string) => string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  Alert.alert(t('musicStreaming.openFailed'), message);
}

async function openYouTubeMusicSearch(query: string): Promise<void> {
  const deepLink = buildYouTubeMusicDeepLink(query);
  try {
    const opened = await Linking.openURL(deepLink);
    if (!opened) {
      await Linking.openURL(buildYouTubeMusicSearchUrl(query));
    }
  } catch {
    await Linking.openURL(buildYouTubeMusicSearchUrl(query));
  }
}

async function openDirectOrSearch(service: MusicStreamingService, directUrl: string | null, query: string): Promise<void> {
  if (directUrl) {
    try {
      const opened = await Linking.openURL(directUrl);
      if (opened) return;
    } catch {
      // fall through to search
    }
  }
  if (service === 'youtube_music') {
    await openYouTubeMusicSearch(query);
    return;
  }
  await Linking.openURL(buildStreamingSearchUrl(service, query));
}

async function openAppleMusicSong(options: OpenMusicSearchOptions, fallbackQuery: string): Promise<void> {
  const artist = options.artistName?.trim() ?? fallbackQuery.trim();
  const title = options.songTitle?.trim();
  if (title) {
    const url = await resolveAppleMusicSongUrl(artist, title);
    await Linking.openURL(url);
    return;
  }
  await Linking.openURL(await resolveAppleMusicArtistUrl(artist));
}

async function openAppleMusicSetlist(options: OpenMusicSearchOptions, fallbackQuery: string): Promise<void> {
  const artistName = options.artistName?.trim() ?? fallbackQuery.replace(/^Setlist\s+/i, '').trim();
  const url = await resolveAppleMusicSetlistUrl({
    artistName,
    artistId: options.artistId,
    tourId: options.tourId,
  });
  await Linking.openURL(url);
}

async function openSongOnService(
  service: MusicStreamingService,
  options: OpenMusicSearchOptions,
  query: string
): Promise<void> {
  if (service === 'apple_music') {
    await openAppleMusicSong(options, query);
    return;
  }

  const artist = options.artistName?.trim() ?? '';
  const title = options.songTitle?.trim() ?? '';
  if (artist && title) {
    try {
      const appleUrl = await resolveAppleMusicSongUrl(artist, title);
      const links = await fetchMusicLinksByAppleUrl(appleUrl);
      if (service === 'spotify') {
        await openDirectOrSearch(service, links.spotify, query);
        return;
      }
      if (service === 'youtube_music') {
        await openDirectOrSearch(service, links.youtubeMusic, query);
        return;
      }
    } catch {
      // fallback below
    }
  }

  if (service === 'youtube_music') {
    await openYouTubeMusicSearch(query);
    return;
  }
  await Linking.openURL(buildStreamingSearchUrl(service, query));
}

async function openService(
  service: MusicStreamingService,
  options: OpenMusicSearchOptions,
  query: string
): Promise<void> {
  writePreferredMusicService(service);
  if (options.intent === 'setlist' && service === 'apple_music') {
    if (options.appleMusicArtistPage) {
      const artistName = options.artistName?.trim() ?? query.replace(/^Setlist\s+/i, '').trim();
      await Linking.openURL(await resolveAppleMusicArtistUrl(artistName));
      return;
    }
    await openAppleMusicSetlist(options, query);
    return;
  }
  if (options.intent === 'song') {
    await openSongOnService(service, options, query);
    return;
  }
  if (service === 'apple_music') {
    await openAppleMusicSong(options, query);
    return;
  }
  if (service === 'youtube_music') {
    await openYouTubeMusicSearch(query);
    return;
  }
  await Linking.openURL(buildStreamingSearchUrl(service, query));
}

export function useOpenMusicSearch() {
  const { t } = useTranslation();

  const openSearch = useCallback(
    (query: string, dialogTitleOrOptions?: string | OpenMusicSearchOptions) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const options: OpenMusicSearchOptions =
        typeof dialogTitleOrOptions === 'string'
          ? { dialogTitle: dialogTitleOrOptions }
          : (dialogTitleOrOptions ?? {});

      const preference = readPreferredMusicService();
      const services = orderStreamingServices(preference);

      const runService = (service: MusicStreamingService) => {
        options.onResolveStart?.();
        void openService(service, options, trimmed)
          .catch((error) => showOpenError(t, error))
          .finally(() => options.onResolveEnd?.());
      };

      Alert.alert(
        options.dialogTitle ?? t('musicStreaming.listenTitle'),
        undefined,
        [
          ...services.map((service) => ({
            text: t(SERVICE_I18N_KEY[service]),
            onPress: () => runService(service),
          })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ],
        { cancelable: true }
      );
    },
    [t]
  );

  return useMemo(() => ({ openSearch }), [openSearch]);
}
