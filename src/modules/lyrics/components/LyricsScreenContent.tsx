import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { buildGeniusSearchUrl, buildSpotifySearchUrl } from '../api';
import { LyricsScrollPanel } from '../components/LyricsScrollPanel';
import { useLyrics } from '../hooks/useLyrics';

type LyricsScreenContentProps = {
  artist: string;
  title: string;
};

async function openExternalUrl(url: string) {
  await WebBrowser.openBrowserAsync(url);
}

export function LyricsScreenContent({ artist, title }: LyricsScreenContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { lyrics, isLoading, error, notFound } = useLyrics(artist, title);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.artist}>{artist}</ThemedText>

      {isLoading ? (
        <ThemedView style={styles.centered}>
          <ThemedText>{t('common.loading')}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && error ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.error}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && notFound ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.emptyTitle}>{t('lyrics.notFoundTitle')}</ThemedText>
          <ThemedText style={styles.emptySubtitle}>{t('lyrics.notFoundSubtitle')}</ThemedText>
          <Button
            title={t('lyrics.openGenius')}
            variant="secondary"
            onPress={() => {
              void openExternalUrl(buildGeniusSearchUrl(artist, title));
            }}
          />
          <Button
            title={t('lyrics.openSpotify')}
            variant="secondary"
            onPress={() => {
              void openExternalUrl(buildSpotifySearchUrl(artist, title));
            }}
          />
        </ThemedView>
      ) : null}

      {!isLoading && lyrics ? (
        <>
          {lyrics.instrumental ? (
            <ThemedText style={styles.instrumental}>{t('lyrics.instrumental')}</ThemedText>
          ) : null}

          <LyricsScrollPanel
            durationSeconds={lyrics.durationSeconds}
            plainLyrics={lyrics.plainLyrics}
            syncedLines={lyrics.syncedLines}
          />

          <View style={styles.footer}>
            <Button
              title={t('live.openMode')}
              onPress={() => {
                router.push({
                  pathname: '/live',
                  params: { artist, title },
                });
              }}
            />
            <ThemedText style={styles.attribution}>{lyrics.attribution}</ThemedText>
          </View>
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  artist: {
    fontSize: 18,
    marginBottom: 16,
    opacity: 0.8,
  },
  attribution: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  emptySubtitle: {
    opacity: 0.75,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  footer: {
    gap: 12,
    marginTop: 16,
  },
  instrumental: {
    fontStyle: 'italic',
    marginBottom: 12,
    opacity: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
});
