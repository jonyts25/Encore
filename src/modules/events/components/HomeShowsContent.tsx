import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { useSession } from '@/modules/identity';

import { useHomeShowSections } from '../hooks/useHomeShowSections';
import { ShowSection } from './ShowSection';
import { getTodayGoingShow, TodayShowCta } from './TodayShowCta';

export function HomeShowsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isGuest, session, isLoading: sessionLoading } = useSession();

  const { sections, isLoading, error } = useHomeShowSections({
    accessToken: session?.access_token ?? null,
    enabled: !sessionLoading && !isGuest,
  });

  if (sessionLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isGuest) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>{t('home.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('home.subtitle')}</ThemedText>
          <ThemedView style={styles.guestCard}>
            <ThemedText style={styles.guestTitle}>{t('home.guestTitle')}</ThemedText>
            <ThemedText style={styles.guestSubtitle}>{t('home.guestSubtitle')}</ThemedText>
            <Button title={t('home.goToProfile')} onPress={() => router.push('/(tabs)/profile')} />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    );
  }

  const todayShow = getTodayGoingShow(sections.going);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t('home.title')}</ThemedText>
        <ThemedText style={styles.subtitle}>{t('home.subtitle')}</ThemedText>

        {!isLoading && !error && todayShow ? <TodayShowCta show={todayShow} /> : null}

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

        {!isLoading && !error ? (
          <>
            <ShowSection
              title={t('home.sections.going')}
              shows={sections.going}
              emptyMessage={t('home.sections.goingEmpty')}
            />
            <ShowSection
              title={t('home.sections.interested')}
              shows={sections.interested}
              emptyMessage={t('home.sections.interestedEmpty')}
            />
            <ShowSection
              title={t('home.sections.forYou')}
              shows={sections.forYou}
              emptyMessage={t('home.sections.forYouEmpty')}
            />
            <ShowSection
              title={t('home.sections.attended')}
              shows={sections.attended}
              emptyMessage={t('home.sections.attendedEmpty')}
            />
          </>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  guestCard: {
    gap: 12,
    marginTop: 24,
  },
  guestSubtitle: {
    lineHeight: 22,
    opacity: 0.75,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 1,
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
