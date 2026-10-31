import { useCallback, useMemo } from 'react';
import { Alert, Linking } from 'react-native';

import { useTranslation } from '@/core/i18n';

import {
  readPreferredMusicService,
  writePreferredMusicService,
} from './musicServicePreference';
import {
  buildStreamingSearchUrl,
  orderStreamingServices,
  type MusicStreamingService,
} from './streamingLinks';

const SERVICE_I18N_KEY: Record<MusicStreamingService, string> = {
  apple_music: 'musicStreaming.appleMusic',
  spotify: 'musicStreaming.spotify',
  youtube_music: 'musicStreaming.youtubeMusic',
};

export function useOpenMusicSearch() {
  const { t } = useTranslation();

  const openSearch = useCallback(
    (query: string, dialogTitle?: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const preference = readPreferredMusicService();
      const services = orderStreamingServices(preference);

      const openService = (service: MusicStreamingService) => {
        writePreferredMusicService(service);
        const url = buildStreamingSearchUrl(service, trimmed);
        void Linking.openURL(url);
      };

      Alert.alert(
        dialogTitle ?? t('musicStreaming.listenTitle'),
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
