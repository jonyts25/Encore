import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';
import { useSession } from '@/modules/identity';
import { ShowSection, useArtistShowSections } from '@/modules/events';

type ArtistShowsSectionProps = {
  artistId: string;
};

export function ArtistShowsSection({ artistId }: ArtistShowsSectionProps) {
  const { t } = useTranslation();
  const { isGuest, session, isLoading: sessionLoading } = useSession();

  const { sections, isLoading, error } = useArtistShowSections({
    artistId,
    accessToken: session?.access_token ?? null,
    enabled: !sessionLoading,
  });

  if (sessionLoading || isLoading) {
    return (
      <ThemedView style={styles.loading}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return <ThemedText style={styles.error}>{error}</ThemedText>;
  }

  const hasYours = !isGuest && sections.yours.length > 0;
  const hasOther = sections.other.length > 0;
  const hasAttended = !isGuest && sections.attended.length > 0;

  if (!hasYours && !hasOther && !hasAttended) {
    return <ThemedText style={styles.empty}>{t('catalog.artistShowsEmpty')}</ThemedText>;
  }

  return (
    <ThemedView style={styles.container}>
      {!isGuest ? (
        <ShowSection
          title={t('catalog.artistShowsYours')}
          shows={sections.yours}
          emptyMessage={t('catalog.artistShowsYoursEmpty')}
        />
      ) : null}
      <ShowSection
        title={t('catalog.artistShowsOther')}
        shows={sections.other}
        emptyMessage={t('catalog.artistShowsOtherEmpty')}
      />
      {!isGuest ? (
        <ShowSection
          title={t('catalog.artistShowsAttended')}
          shows={sections.attended}
          emptyMessage={t('catalog.artistShowsAttendedEmpty')}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    marginTop: 8,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  error: {
    color: '#D64545',
    marginTop: 8,
  },
  loading: {
    marginTop: 8,
    paddingVertical: 8,
  },
});
