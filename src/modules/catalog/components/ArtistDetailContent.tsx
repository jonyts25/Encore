import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import { useArtistDetail } from '../hooks/useArtistDetail';

import { ArtistLinksRow } from './ArtistLinksRow';
import { ArtistShowsSection } from './ArtistShowsSection';
import { FollowArtistButton } from './FollowArtistButton';

const HERO_HEIGHT = 280;
const HERO_PLACEHOLDER = '#1B1024';

type ArtistDetailContentProps = {
  artistId: string;
};

export function ArtistDetailContent({ artistId }: ArtistDetailContentProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { artist, isLoading, error } = useArtistDetail(artistId);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={[typography.body, { color: tokens.textSecondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={[typography.body, { color: tokens.recording, textAlign: 'center' }]}>
          {error ?? t('catalog.artistNotFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
      <View style={styles.hero}>
        <Image
          contentFit="cover"
          source={artist.image_url ? { uri: artist.image_url } : undefined}
          style={[styles.heroImage, { backgroundColor: HERO_PLACEHOLDER }]}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroText, { paddingTop: insets.top + spacing.md }]}>
          <Text style={[typography.largeTitle, styles.heroName, { color: tokens.onAccent }]}>
            {artist.name}
          </Text>
          {artist.genres?.length ? (
            <View style={styles.genreRow}>
              {artist.genres.map((genre) => (
                <View key={genre} style={styles.genreChip}>
                  <Text style={[typography.footnoteSemibold, styles.genreText]}>{genre}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <FollowArtistButton artistId={artist.id} />
        <ArtistShowsSection artistId={artist.id} />
        <ArtistLinksRow artistId={artist.id} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.xl,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  genreChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  genreText: {
    color: '#FFF',
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroName: {
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroText: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenHorizontal,
  },
});
