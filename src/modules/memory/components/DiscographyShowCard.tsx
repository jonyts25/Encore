import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { formatShowDate } from '@/modules/events/api';

import type { DiscographyShowEntry } from '../types';

type DiscographyShowCardProps = {
  entry: DiscographyShowEntry;
  locale: string;
};

export function DiscographyShowCard({ entry, locale }: DiscographyShowCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { show, memory, firstMedia } = entry;
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    if (!firstMedia?.assetId || Platform.OS === 'web') {
      setThumbUri(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(firstMedia.assetId);
        if (!cancelled) setThumbUri(info.localUri ?? info.uri);
      } catch {
        if (!cancelled) setThumbUri(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firstMedia?.assetId]);

  const imageSource = thumbUri
    ? { uri: thumbUri }
    : show.artist.image_url
      ? { uri: show.artist.image_url }
      : undefined;

  const openShow = () => router.push(`/show/${show.id}`);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: tokens.surface }]}
      onPress={openShow}>
      <View style={styles.thumbWrap}>
        <Image contentFit="cover" source={imageSource} style={styles.thumb} />
        {firstMedia?.mediaType === 'video' ? (
          <View style={styles.playBadge}>
            <Ionicons color="#fff" name="play" size={12} />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={[typography.bodySemibold, { color: tokens.text }]} numberOfLines={1}>
          {show.artist.name}
        </Text>
        <Text style={[typography.footnote, { color: tokens.textSecondary }]} numberOfLines={1}>
          {show.venue.name} · {show.venue.city}
        </Text>
        <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
          {formatShowDate(show.show_date, locale)}
        </Text>
        {memory.rating != null ? (
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                color="#F5B301"
                name={star <= memory.rating! ? 'star' : 'star-outline'}
                size={14}
              />
            ))}
          </View>
        ) : null}
        {memory.setlistConfirmedAt ? (
          <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
            {t('discography.songsCount', { count: memory.songsPlayedCount })}
          </Text>
        ) : (
          <View onStartShouldSetResponder={() => true}>
            <PillButton
              title={t('discography.confirmSetlist')}
              variant="secondary"
              onPress={openShow}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 14,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
  },
  playBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    bottom: 6,
    padding: 4,
    position: 'absolute',
    right: 6,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  thumb: {
    borderRadius: 10,
    height: '100%',
    width: '100%',
  },
  thumbWrap: {
    height: 88,
    overflow: 'hidden',
    position: 'relative',
    width: 88,
  },
});
