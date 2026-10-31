import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useArtistFollow } from '../hooks/useArtistFollow';
import { ArtistFavoriteStar } from './ArtistFavoriteStar';

type FollowArtistButtonProps = {
  artistId: string;
};

export function FollowArtistButton({ artistId }: FollowArtistButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
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

    void (async () => {
      try {
        if (isFollowing) {
          await unfollow();
        } else {
          await follow();
        }
      } catch {
        // Error state is surfaced below.
      }
    })();
  };

  const title = requiresAuth
    ? t('catalog.follow')
    : isFollowing
      ? t('catalog.unfollow')
      : t('catalog.follow');

  return (
    <ThemedView style={styles.container}>
      {requiresAuth ? (
        <ThemedText style={styles.authHint}>{t('catalog.followRequiresAuth')}</ThemedText>
      ) : null}
      {!requiresAuth && isFollowing ? (
        <ThemedText style={styles.followingLabel}>{t('catalog.following')}</ThemedText>
      ) : null}
      <View style={styles.actionsRow}>
        <Button
          disabled={isLoading || isMutating}
          style={styles.followButton}
          title={isLoading || isMutating ? t('common.loading') : title}
          variant={isFollowing && !requiresAuth ? 'secondary' : 'primary'}
          onPress={handlePress}
        />
        {isFollowing && !requiresAuth ? (
          <ArtistFavoriteStar
            artistId={artistId}
            disabled={isMutating}
            isFavorite={isFavorite}
            onFavoriteChanged={setIsFavorite}
          />
        ) : null}
      </View>
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 4,
  },
  authHint: {
    fontSize: 13,
    opacity: 0.75,
    textAlign: 'center',
  },
  container: {
    gap: 8,
    marginTop: 8,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  followButton: {
    flex: 1,
  },
  followingLabel: {
    color: '#2E9B4F',
    fontWeight: '600',
    textAlign: 'center',
  },
});
