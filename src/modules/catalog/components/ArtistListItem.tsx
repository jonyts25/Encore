import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText, ThemedView } from '@/core/ui/Themed';

import type { Artist, FollowedArtist } from '../types';
import { ArtistFavoriteStar } from './ArtistFavoriteStar';

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

  const isFavorite = isFollowedArtist(artist) ? artist.isFavorite : false;

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
        {showFavoriteToggle && isFollowedArtist(artist) ? (
          <ArtistFavoriteStar
            artistId={artist.id}
            isFavorite={isFavorite}
            onFavoriteChanged={() => onFavoriteChanged?.()}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  artistName: {
    fontSize: 17,
    fontWeight: '600',
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
