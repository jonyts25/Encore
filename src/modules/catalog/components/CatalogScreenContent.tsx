import { StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { useArtistCatalogSearch } from '../hooks/useArtistCatalogSearch';
import { ArtistDisambiguationList } from './ArtistDisambiguationList';
import { ArtistListItem } from './ArtistListItem';

export function CatalogScreenContent() {
  const { t } = useTranslation();
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
  } = useArtistCatalogSearch();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('catalog.title')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('catalog.subtitle')}</ThemedText>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('catalog.searchPlaceholder')}
        placeholderTextColor="#888"
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
      />

      {isLoading ? (
        <ThemedView style={styles.centered}>
          <ThemedText>{t('common.loading')}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && isResolving ? (
        <ThemedView style={styles.centered}>
          <ThemedText>{t('catalog.resolvingArtist')}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && !isResolving && !isConfirming && error ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.error}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      {!isLoading && !isResolving && !isConfirming && !error && candidates.length > 0 ? (
        <ArtistDisambiguationList
          candidates={candidates}
          isConfirming={isConfirming}
          onSelect={confirmCandidate}
        />
      ) : null}

      {!isLoading && !isResolving && !isConfirming && !error && candidates.length === 0 && artists.length === 0 ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.emptyTitle}>
            {query.trim() ? t('catalog.noResults') : t('catalog.emptyTitle')}
          </ThemedText>
          {!query.trim() ? (
            <ThemedText style={styles.emptySubtitle}>{t('catalog.emptySubtitle')}</ThemedText>
          ) : null}
        </ThemedView>
      ) : null}

      {!isLoading && !isResolving && !isConfirming && !error && artists.length > 0 ? (
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
