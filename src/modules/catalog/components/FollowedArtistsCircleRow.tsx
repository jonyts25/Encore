import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import type { FollowedArtist } from '../types';

const CIRCLE_SIZE = 72;

type FollowedArtistsCircleRowProps = {
  artists: FollowedArtist[];
  onSeeAll?: () => void;
};

export function FollowedArtistsCircleRow({ artists, onSeeAll }: FollowedArtistsCircleRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();

  if (artists.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {artists.map((artist) => (
          <Pressable
            key={artist.id}
            style={styles.item}
            onPress={() => router.push(`/artist/${artist.id}`)}>
            <View style={styles.avatarWrap}>
              <Image
                contentFit="cover"
                source={artist.image_url ? { uri: artist.image_url } : undefined}
                style={[styles.circle, { backgroundColor: tokens.fillMuted }]}
              />
              {artist.isFavorite ? (
                <View style={[styles.favoriteBadge, { backgroundColor: tokens.surface }]}>
                  <Ionicons color="#F5B301" name="star" size={12} />
                </View>
              ) : null}
            </View>
            <Text style={[typography.footnote, { color: tokens.textSecondary }]} numberOfLines={1}>
              {artist.name}
            </Text>
          </Pressable>
        ))}
        {onSeeAll ? (
          <Pressable accessibilityRole="button" style={styles.item} onPress={onSeeAll}>
            <View style={[styles.seeAllCircle, { borderColor: tokens.separator }]}>
              <Ionicons color={tokens.accent} name="chevron-forward" size={28} />
            </View>
            <Text style={[typography.footnote, { color: tokens.accent }]} numberOfLines={1}>
              {t('profile.yourArtistsSeeAll')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    position: 'relative',
  },
  circle: {
    borderRadius: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    width: CIRCLE_SIZE,
  },
  favoriteBadge: {
    alignItems: 'center',
    borderRadius: 10,
    bottom: 0,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 20,
  },
  item: {
    alignItems: 'center',
    maxWidth: 88,
    width: 88,
  },
  row: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  seeAllCircle: {
    alignItems: 'center',
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    width: CIRCLE_SIZE,
  },
  wrap: {
    gap: spacing.sm,
  },
});
