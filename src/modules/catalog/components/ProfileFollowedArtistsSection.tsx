import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { SectionHeader } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme';

import { useFollowedArtists } from '../hooks/useFollowedArtists';
import { FollowedArtistsCircleRow } from './FollowedArtistsCircleRow';

const PREVIEW_LIMIT = 12;

type ProfileFollowedArtistsSectionProps = {
  userId: string;
};

export function ProfileFollowedArtistsSection({ userId }: ProfileFollowedArtistsSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { artists, isLoading } = useFollowedArtists(userId);

  if (isLoading) {
    return (
      <View style={{ gap: 8 }}>
        <SectionHeader title={t('profile.yourArtistsTitle')} />
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (artists.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        <SectionHeader title={t('profile.yourArtistsTitle')} />
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
          {t('profile.yourArtistsEmpty')}
        </Text>
      </View>
    );
  }

  const preview = artists.slice(0, PREVIEW_LIMIT);

  return (
    <View style={{ gap: 8 }}>
      <SectionHeader title={t('profile.yourArtistsTitle')} />
      <FollowedArtistsCircleRow
        artists={preview}
        onSeeAll={() => {
          router.push('/followed-artists');
        }}
      />
    </View>
  );
}
