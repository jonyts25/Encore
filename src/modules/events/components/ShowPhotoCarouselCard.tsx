import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { typography } from '@/core/ui/theme';
import { useEncoreTheme } from '@/core/ui/theme';

import { formatShowCardMetaLine } from '../showVenueTime';
import type { Show } from '../types';

type ShowPhotoCarouselCardProps = {
  show: Show;
  imageHeight?: number;
  imageWidth?: number;
};

export function ShowPhotoCarouselCard({
  show,
  imageHeight = 120,
  imageWidth = 164,
}: ShowPhotoCarouselCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { tokens } = useEncoreTheme();

  return (
    <Pressable style={[styles.item, { width: imageWidth }]} onPress={() => router.push(`/show/${show.id}`)}>
      <Image
        contentFit="cover"
        source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
        style={[styles.image, { height: imageHeight, width: imageWidth }]}
      />
      <Text style={[typography.bodySemibold, { color: tokens.text }]} numberOfLines={1}>
        {show.artist.name}
      </Text>
      <Text style={[typography.footnote, { color: tokens.textSecondary }]} numberOfLines={2}>
        {formatShowCardMetaLine(show, i18n.language, t)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#222',
    borderRadius: 18,
  },
  item: {
    gap: 8,
  },
});
