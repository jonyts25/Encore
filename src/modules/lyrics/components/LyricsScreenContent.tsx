import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { GlassIconButton, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { useShow } from '@/modules/events/hooks/useShow';

import { LyricsScrollPanel } from '../components/LyricsScrollPanel';
import { PracticeLyricsEmptyContent } from '../components/PracticeLyricsEmptyContent';
import { useLyrics } from '../hooks/useLyrics';

type LyricsScreenContentProps = {
  artist: string;
  title: string;
  showId?: string;
};

export function LyricsScreenContent({ artist, title, showId }: LyricsScreenContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const trimmedTitle = title.trim();
  const showQuery = useShow(showId ?? '');
  const show = showId && !trimmedTitle ? showQuery.show : null;
  const isShowLoading = showId && !trimmedTitle ? showQuery.isLoading : false;
  const { lyrics, isLoading, error, isBusy, notFound, refetch } = useLyrics(artist, trimmedTitle);

  if (!trimmedTitle && showId) {
    return (
      <ThemedView
        style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}
      >
        <View style={styles.topBar}>
          <GlassIconButton
            accessibilityLabel={t('live.back')}
            icon="chevron-back"
            onPress={() => router.back()}
          />
        </View>
        {isShowLoading || !show ? (
          <ThemedView style={styles.centered}>
            <ThemedText>{t('common.loading')}</ThemedText>
          </ThemedView>
        ) : (
          <PracticeLyricsEmptyContent show={show} />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Text numberOfLines={2} style={[styles.title, { color: tokens.text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.artist, { color: tokens.textSecondary }]}>
          {artist}
        </Text>
      </View>

      {isLoading ? (
        <ThemedView style={styles.centered}>
          <ThemedText>{t('common.loading')}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && error ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText>
          {isBusy ? <Button title={t('lyrics.retry')} onPress={() => void refetch()} /> : null}
        </ThemedView>
      ) : null}

      {!isLoading && notFound ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.emptyTitle}>{t('lyrics.notFoundTitle')}</ThemedText>
          <ThemedText style={styles.emptySubtitle}>{t('lyrics.notFoundSubtitle')}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && lyrics ? (
        <LyricsScrollPanel
          autoStart
          fixedGlassToolbar
          durationSeconds={lyrics.durationSeconds}
          footerActions={
            <PillButton
              title={t('lyrics.openLive')}
              onPress={() => {
                router.push({
                  pathname: '/live',
                  params: showId ? { artist, title, showId } : { artist, title },
                });
              }}
            />
          }
          plainLyrics={lyrics.plainLyrics}
          showModeLabel={false}
          style={styles.lyricsPanel}
          syncedLines={lyrics.syncedLines}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  artist: {
    fontSize: 17,
    marginTop: 4,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    marginBottom: 8,
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
    textAlign: 'center',
  },
  header: {
    marginBottom: 12,
  },
  lyricsPanel: {
    flex: 1,
    marginTop: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
