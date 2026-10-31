import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { Card, GlassIconButton, SectionHeader } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { ProfileFollowedArtistsSection } from '@/modules/catalog/components/ProfileFollowedArtistsSection';
import { ProfileMyMapCard } from '@/modules/events/components/ProfileMyMapCard';
import { ShowPhotoCarouselCard } from '@/modules/events/components/ShowPhotoCarouselCard';
import { useHomeShowSections } from '@/modules/events/hooks/useHomeShowSections';
import { computeProfileStats } from '@/modules/identity/profileStatsLogic';

import { useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';

const TAB_BAR_CLEARANCE = 72;
const AVATAR_SIZE = 88;

function memberSinceLabel(createdAt: string | undefined, locale: string): string {
  if (!createdAt) return '—';
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(new Date(createdAt));
}

function avatarInitial(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function ProfileScreenContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { user, session, isOfflineSession, lastKnownUser, isLoading: sessionLoading } = useSession();
  const { profile, isLoading: profileLoading, error } = useProfile();

  const { sections, isLoading: homeLoading } = useHomeShowSections({
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
    enabled: !sessionLoading && Boolean(user),
  });

  const stats = useMemo(
    () =>
      computeProfileStats({
        attendedShows: sections.attended,
        goingShows: sections.going,
      }),
    [sections.attended, sections.going]
  );

  const attendedSorted = useMemo(
    () =>
      [...sections.attended].sort(
        (a, b) => new Date(b.show_date).getTime() - new Date(a.show_date).getTime()
      ),
    [sections.attended]
  );

  const displayName =
    profile?.display_name ??
    lastKnownUser?.display_name ??
    user?.email?.split('@')[0] ??
    'Fan';
  const year = new Date().getFullYear();

  if (sessionLoading || profileLoading || homeLoading) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: tokens.textSecondary }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: tokens.recording }}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: spacing.xl,
      }}>
      <View style={styles.titleRow}>
        <Text style={[typography.largeTitle, { color: tokens.text, flex: 1 }]}>
          {t('identity.profileTitle')}
        </Text>
        <GlassIconButton
          accessibilityLabel={t('settings.title')}
          icon="settings-outline"
          onPress={() => router.push('/settings')}
        />
      </View>

      <View style={styles.identityBlock}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: tokens.accent }]}>
            <Text style={[styles.avatarInitial, { color: tokens.onAccent }]}>{avatarInitial(displayName)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={[styles.cameraBadge, { backgroundColor: tokens.surface }]}
            onPress={() => Alert.alert(t('profile.avatarComingSoon'))}>
            <Ionicons color={tokens.text} name="camera" size={16} />
          </Pressable>
        </View>
        <Text style={[typography.title, { color: tokens.text, textAlign: 'center' }]}>{displayName}</Text>
        <Text style={[typography.secondary, { color: tokens.textSecondary, textAlign: 'center' }]}>
          {t('profile.memberSince', { date: memberSinceLabel(user?.created_at, i18n.language) })}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: t('profile.stats.shows'), value: stats.showsAttended },
          { label: t('profile.stats.artists'), value: stats.distinctArtists },
          { label: t('profile.stats.cities'), value: stats.distinctCities },
          { label: t('profile.stats.upcoming'), value: stats.upcomingGoing },
        ].map((item) => (
          <Card key={item.label} style={styles.statCard}>
            <Text style={[typography.largeTitle, { color: tokens.text, fontSize: 28 }]}>{item.value}</Text>
            <Text style={[typography.footnote, { color: tokens.textSecondary }]}>{item.label}</Text>
          </Card>
        ))}
      </View>

      {user ? <ProfileFollowedArtistsSection userId={user.id} /> : null}

      {user ? <ProfileMyMapCard /> : null}

      <Card>
        <Text style={[typography.bodySemibold, { color: tokens.text }]}>
          {t('profile.recapTitle', { year })}
        </Text>
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
          {t('profile.recapSubtitle')}
        </Text>
      </Card>

      <View style={styles.section}>
        <SectionHeader title={t('profile.attendedTitle')} />
        {attendedSorted.length === 0 ? (
          <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
            {t('profile.attendedEmpty')}
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {attendedSorted.map((show) => (
              <ShowPhotoCarouselCard key={show.id} show={show} />
            ))}
          </ScrollView>
        )}
      </View>

      {isOfflineSession ? (
        <Text style={[typography.footnote, { color: tokens.textSecondary, textAlign: 'center' }]}>
          {t('offline.banner')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    width: AVATAR_SIZE,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
  },
  avatarWrap: {
    alignSelf: 'center',
  },
  cameraBadge: {
    alignItems: 'center',
    borderRadius: 16,
    bottom: 0,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 32,
  },
  carousel: {
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  identityBlock: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  statCard: {
    alignItems: 'flex-start',
    flex: 1,
    minWidth: '46%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
