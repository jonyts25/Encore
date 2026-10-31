import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { setArtistFavorite, useSession } from '@/modules/identity';

type ArtistFavoriteStarProps = {
  artistId: string;
  isFavorite: boolean;
  disabled?: boolean;
  size?: number;
  onFavoriteChanged?: (isFavorite: boolean) => void;
};

export function ArtistFavoriteStar({
  artistId,
  isFavorite,
  disabled = false,
  size = 24,
  onFavoriteChanged,
}: ArtistFavoriteStarProps) {
  const { t } = useTranslation();
  const { user } = useSession();
  const [isMutating, setIsMutating] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const toggleFavorite = async () => {
    if (!user || isMutating || disabled) return;

    setFavoriteError(null);
    setIsMutating(true);
    try {
      const result = await setArtistFavorite(user.id, artistId, !isFavorite);
      if (!result.ok) {
        if (result.reason === 'limit_reached') {
          setFavoriteError(t('catalog.favoriteLimit'));
        }
        return;
      }
      hapticSelection();
      onFavoriteChanged?.(result.isFavorite);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <View>
      <Pressable
        accessibilityLabel={
          isFavorite ? t('catalog.unfavoriteArtist') : t('catalog.favoriteArtist')
        }
        accessibilityRole="button"
        disabled={disabled || isMutating}
        hitSlop={10}
        onPress={() => {
          void toggleFavorite();
        }}
        style={({ pressed }) => [styles.starButton, pressed && styles.starButtonPressed]}>
        <Ionicons
          color={isFavorite ? '#F5B301' : '#B0B0B5'}
          name={isFavorite ? 'star' : 'star-outline'}
          size={size}
        />
      </Pressable>
      {favoriteError ? <Text style={styles.favoriteError}>{favoriteError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  favoriteError: {
    color: '#D64545',
    fontSize: 13,
    marginTop: 4,
    maxWidth: 160,
    textAlign: 'center',
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
});
