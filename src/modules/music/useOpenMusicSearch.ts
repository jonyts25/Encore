import { useCallback, useMemo } from 'react';
import { Alert, Linking } from 'react-native';

import { useTranslation } from '@/core/i18n';

import { resolveAppleMusicArtistUrl, resolveAppleMusicSongUrl } from './appleMusicItunes';
import {
  readPreferredMusicService,
  writePreferredMusicService,
} from './musicServicePreference';
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
  artistName?: string;
  songTitle?: string;
};

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

async function openAppleMusicSearch(options: OpenMusicSearchOptions, fallbackQuery: string): Promise<void> {
  const artist = options.artistName?.trim() ?? fallbackQuery.trim();
  if (options.intent === 'setlist') {
    const url = await resolveAppleMusicArtistUrl(artist);
    await Linking.openURL(url);
    return;
  }

  const title = options.songTitle?.trim();
  if (title) {
    const url = await resolveAppleMusicSongUrl(artist, title);
    await Linking.openURL(url);
    return;
  }

  await Linking.openURL(await resolveAppleMusicArtistUrl(artist));
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

      const openService = (service: MusicStreamingService) => {
        writePreferredMusicService(service);
        void (async () => {
          if (service === 'apple_music') {
            await openAppleMusicSearch(options, trimmed);
            return;
          }
          if (service === 'youtube_music') {
            await openYouTubeMusicSearch(trimmed);
            return;
          }
          await Linking.openURL(buildStreamingSearchUrl(service, trimmed));
        })();
      };

      Alert.alert(
        options.dialogTitle ?? t('musicStreaming.listenTitle'),
        undefined,
        [
          ...services.map((service) => ({
            text: t(SERVICE_I18N_KEY[service]),
            onPress: () => openService(service),
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
