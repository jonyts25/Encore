import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { useSession } from '@/modules/identity';

import { useArtistCatalogSearch, type CatalogViewMode } from '../hooks/useArtistCatalogSearch';
import { ArtistDisambiguationList } from './ArtistDisambiguationList';
import { ArtistListItem } from './ArtistListItem';

export function CatalogScreenContent() {
  const { t } = useTranslation();
  const { isGuest, user, isLoading: sessionLoading } = useSession();
  const [viewMode, setViewMode] = useState<CatalogViewMode>('all');

  useEffect(() => {
    if (isGuest && viewMode === 'followed') {
      setViewMode('all');
    }
  }, [isGuest, viewMode]);

  const {
    query,
    setQuery,
    artists,
    candidates,
    isLoading,
    isResolving,
    isConfirming,
    error,
    confirmCandidate,
    followedOnly,
  } = useArtistCatalogSearch({
    viewMode: isGuest ? 'all' : viewMode,
    userId: user?.id ?? null,
    enabled: !sessionLoading,
  });

  const showBusy = isLoading || sessionLoading;
  const showFollowedEmpty =
    followedOnly && !showBusy && !isResolving && !isConfirming && !error && artists.length === 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('catalog.title')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('catalog.subtitle')}</ThemedText>

      <ThemedView style={styles.filterRow}>
        <Button
          title={t('catalog.filterAll')}
          variant={viewMode === 'all' ? 'primary' : 'secondary'}
          style={styles.filterButton}
          onPress={() => setViewMode('all')}
        />
        <Button
          title={t('catalog.filterFollowed')}
          variant={viewMode === 'followed' ? 'primary' : 'secondary'}
          style={styles.filterButton}
          disabled={isGuest}
          onPress={() => setViewMode('followed')}
        />
      </ThemedView>

      {isGuest ? (
        <ThemedText style={styles.guestHint}>{t('catalog.followedRequiresAuth')}</ThemedText>
      ) : null}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('catalog.searchPlaceholder')}
        placeholderTextColor="#888"
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
      />

      {showBusy ? (
        <ThemedView style={styles.centered}>
          <ThemedText>{t('common.loading')}</ThemedText>
        </ThemedView>
      ) : null}

      {!showBusy && isResolving ? (
        <ThemedView style={styles.centered}>
          <ThemedText>{t('catalog.resolvingArtist')}</ThemedText>
        </ThemedView>
      ) : null}

      {!showBusy && !isResolving && !isConfirming && error ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.error}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      {!showBusy && !isResolving && !isConfirming && !error && candidates.length > 0 ? (
        <ArtistDisambiguationList
          candidates={candidates}
          isConfirming={isConfirming}
          onSelect={confirmCandidate}
        />
      ) : null}

      {showFollowedEmpty ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.emptyTitle}>{t('catalog.followedEmptyTitle')}</ThemedText>
          <ThemedText style={styles.emptySubtitle}>{t('catalog.followedEmptySubtitle')}</ThemedText>
        </ThemedView>
      ) : null}

      {!showBusy &&
      !isResolving &&
      !isConfirming &&
      !error &&
      !showFollowedEmpty &&
      candidates.length === 0 &&
      artists.length === 0 ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.emptyTitle}>
            {query.trim() ? t('catalog.noResults') : t('catalog.emptyTitle')}
          </ThemedText>
          {!query.trim() ? (
            <ThemedText style={styles.emptySubtitle}>{t('catalog.emptySubtitle')}</ThemedText>
          ) : null}
        </ThemedView>
      ) : null}

      {!showBusy && !isResolving && !isConfirming && !error && artists.length > 0 ? (
        <View style={styles.list}>
          {artists.map((artist) => (
            <ArtistListItem key={artist.id} artist={artist} />
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptySubtitle: {
    marginTop: 8,
    opacity: 0.7,
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
  filterButton: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  guestHint: {
    fontSize: 13,
    marginTop: 8,
    opacity: 0.75,
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: '#F4F4F4',
    borderColor: '#DDD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.75,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
