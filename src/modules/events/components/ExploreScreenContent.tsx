import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { useIsOffline } from '@/core/network/useIsOffline';
import { Card, PillButton, SectionHeader } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { useArtistCatalogSearch } from '@/modules/catalog/hooks/useArtistCatalogSearch';
import { useSession } from '@/modules/identity';

import { useUpcomingShows } from '../hooks/useUpcomingShows';
import { ShowListItem } from './ShowListItem';

const TAB_BAR_CLEARANCE = 72;

export function ExploreScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const isOffline = useIsOffline();
  const { isGuest, session, user, isLoading: sessionLoading } = useSession();

  const { shows, isLoading: showsLoading, error: showsError, refetch, isFetching } =
    useUpcomingShows({
      followedOnly: false,
      userId: user?.id ?? null,
      accessToken: session?.access_token ?? null,
      enabled: !sessionLoading,
    });

  const {
    query,
    setQuery,
    artists,
    isLoading: artistsLoading,
    error: artistsError,
    refetch: refetchArtists,
  } = useArtistCatalogSearch({
    viewMode: 'all',
    userId: user?.id ?? null,
    enabled: !sessionLoading,
  });

  const filteredShows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shows;
    return shows.filter(
      (show) =>
        show.artist.name.toLowerCase().includes(q) ||
        show.venue.name.toLowerCase().includes(q) ||
        show.venue.city?.toLowerCase().includes(q)
    );
  }, [query, shows]);

  const onRefresh = () => {
    void refetch();
    void refetchArtists();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: spacing.xl,
      }}
      refreshControl={
        <RefreshControl refreshing={isFetching && !showsLoading} onRefresh={onRefresh} />
      }
      keyboardShouldPersistTaps="handled">
      <TextInput
        placeholder={t('explore.searchPlaceholder')}
        placeholderTextColor={tokens.textSecondary}
        style={[
          styles.search,
          {
            backgroundColor: tokens.surface,
            color: tokens.text,
            borderColor: tokens.separator,
          },
        ]}
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.section}>
        <SectionHeader title={t('explore.upcomingShows')} />
        {showsLoading ? (
          <Text style={{ color: tokens.textSecondary }}>{t('common.loading')}</Text>
        ) : null}
        {showsError ? (
          <Card>
            <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
              {showsError}
            </Text>
            <PillButton title={t('explore.retry')} variant="secondary" onPress={() => void refetch()} />
          </Card>
        ) : null}
        {!showsLoading && !showsError && filteredShows.length === 0 ? (
          <Card>
            <Text style={[typography.bodySemibold, { color: tokens.text }]}>
              {t('explore.showsEmptyTitle')}
            </Text>
            <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
              {t('explore.showsEmptySubtitle')}
            </Text>
          </Card>
        ) : null}
        {filteredShows.slice(0, 8).map((show) => (
          <ShowListItem key={show.id} show={show} showPackStatus={false} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('explore.artists')} />
        {artistsLoading ? (
          <Text style={{ color: tokens.textSecondary }}>{t('common.loading')}</Text>
        ) : null}
        {artistsError ? (
          <Text style={{ color: tokens.textSecondary }}>{artistsError}</Text>
        ) : null}
        {!artistsLoading && artists.length === 0 ? (
          <Card>
            <Text style={[typography.bodySemibold, { color: tokens.text }]}>
              {t('catalog.emptyTitle')}
            </Text>
            <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
              {query ? t('catalog.noResults') : t('catalog.emptySubtitle')}
            </Text>
          </Card>
        ) : null}
        <FlatList
          data={artists.slice(0, 12)}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.artistRow}>
              <Text
                style={[typography.bodySemibold, { color: tokens.text }]}
                onPress={() => router.push(`/artist/${item.id}`)}>
                {item.name}
              </Text>
              {item.genres?.length ? (
                <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
                  {item.genres.slice(0, 3).join(' · ')}
                </Text>
              ) : null}
            </Card>
          )}
        />
      </View>

      {isOffline ? (
        <Text style={[typography.footnote, { color: tokens.textSecondary, textAlign: 'center' }]}>
          {t('offline.banner')}
        </Text>
      ) : null}

      {isGuest ? (
        <PillButton
          title={t('explore.signInCta')}
          onPress={() => router.push('/profile')}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  artistRow: {
    marginBottom: spacing.sm,
  },
  search: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
});
