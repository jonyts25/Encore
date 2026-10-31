import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';
import { setArtistFavorite, useSession } from '@/modules/identity';

import type { Artist, FollowedArtist } from '../types';

type ArtistListItemProps = {
  artist: Artist | FollowedArtist;
  showFavoriteToggle?: boolean;
  onFavoriteChanged?: () => void;
};

function isFollowedArtist(artist: Artist | FollowedArtist): artist is FollowedArtist {
  return 'isFavorite' in artist;
}

export function ArtistListItem({
  artist,
  showFavoriteToggle = false,
  onFavoriteChanged,
}: ArtistListItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useSession();
  const [isMutatingFavorite, setIsMutatingFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const isFavorite = isFollowedArtist(artist) ? artist.isFavorite : false;

  const toggleFavorite = async () => {
    if (!showFavoriteToggle || !user || !isFollowedArtist(artist) || isMutatingFavorite) return;

    setFavoriteError(null);
    setIsMutatingFavorite(true);
    try {
      const result = await setArtistFavorite(user.id, artist.id, !artist.isFavorite);
      if (!result.ok) {
        if (result.reason === 'limit_reached') {
          setFavoriteError(t('catalog.favoriteLimit'));
        }
        return;
      }
      hapticSelection();
      onFavoriteChanged?.();
    } finally {
      setIsMutatingFavorite(false);
    }
  };

  return (
    <View>
      <Pressable
        onPress={() => {
          router.push(`/artist/${artist.id}`);
        }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        {artist.image_url ? (
          <Image source={{ uri: artist.image_url }} style={styles.thumbnail} />
        ) : (
          <ThemedView style={styles.thumbnailPlaceholder}>
            <ThemedText style={styles.thumbnailInitial}>{artist.name.charAt(0)}</ThemedText>
          </ThemedView>
        )}
        <ThemedView style={styles.rowBody}>
          <ThemedText style={styles.artistName}>{artist.name}</ThemedText>
          {artist.genres?.length ? (
            <ThemedText style={styles.genres}>{artist.genres.join(' · ')}</ThemedText>
          ) : null}
        </ThemedView>
        {showFavoriteToggle ? (
          <Pressable
            accessibilityLabel={
              isFavorite ? t('catalog.unfavoriteArtist') : t('catalog.favoriteArtist')
            }
            accessibilityRole="button"
            disabled={isMutatingFavorite}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              void toggleFavorite();
            }}
            style={({ pressed }) => [styles.starButton, pressed && styles.starButtonPressed]}>
            <Ionicons
              color={isFavorite ? '#F5B301' : '#B0B0B5'}
              name={isFavorite ? 'star' : 'star-outline'}
              size={24}
            />
          </Pressable>
        ) : null}
      </Pressable>
      {favoriteError ? <Text style={styles.favoriteError}>{favoriteError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  artistName: {
    fontSize: 17,
    fontWeight: '600',
  },
  favoriteError: {
    color: '#D64545',
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  genres: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  rowBody: {
    flex: 1,
  },
  rowPressed: {
    opacity: 0.7,
  },
  starButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  starButtonPressed: {
    opacity: 0.7,
  },
  thumbnail: {
    borderRadius: 8,
    height: 52,
    width: 52,
  },
  thumbnailInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8EEF8',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
});
