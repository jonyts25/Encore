import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme';

import { useArtistFollow } from '../hooks/useArtistFollow';
import { ArtistFavoriteStar } from './ArtistFavoriteStar';

type FollowArtistButtonProps = {
  artistId: string;
};

export function FollowArtistButton({ artistId }: FollowArtistButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const {
    isFollowing,
    isFavorite,
    isLoading,
    isMutating,
    requiresAuth,
    follow,
    unfollow,
    setIsFavorite,
    error,
  } = useArtistFollow(artistId);

  const handlePress = () => {
    if (requiresAuth) {
      router.push('/(tabs)/profile');
      return;
    }

    if (isFollowing) {
      Alert.alert(t('catalog.unfollowConfirmTitle'), t('catalog.unfollowConfirmMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('catalog.unfollowConfirmAction'),
          style: 'destructive',
          onPress: () => {
            void unfollow().catch(() => undefined);
          },
        },
      ]);
      return;
    }

    void follow().catch(() => undefined);
  };

  const title = requiresAuth
    ? t('catalog.follow')
    : isFollowing
      ? t('catalog.followingCheck')
      : t('catalog.follow');

  return (
    <View style={styles.container}>
      <View style={styles.pillWrap}>
        <PillButton
          disabled={isLoading || isMutating}
          title={isLoading || isMutating ? t('common.loading') : title}
          variant={isFollowing && !requiresAuth ? 'secondary' : 'primary'}
          onPress={handlePress}
        />
      </View>
      {isFollowing && !requiresAuth ? (
        <ArtistFavoriteStar
          artistId={artistId}
          disabled={isMutating}
          isFavorite={isFavorite}
          size={22}
          onFavoriteChanged={setIsFavorite}
        />
      ) : null}
      {error ? (
        <Text style={[typography.footnote, { color: tokens.recording }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
  },
  pillWrap: {
    alignSelf: 'flex-start',
  },
});
