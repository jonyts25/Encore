import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { fetchArtistLinks } from '../api';
import type { ArtistLink, ArtistLinkPlatform } from '../types';

type ArtistLinksRowProps = {
  artistId: string;
};

const PLATFORM_GLYPH: Record<ArtistLinkPlatform, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Web',
  apple_music: 'Apple',
};

export function ArtistLinksRow({ artistId }: ArtistLinksRowProps) {
  const { t } = useTranslation();
  const [links, setLinks] = useState<ArtistLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchArtistLinks(artistId);
      setLinks(data);
    } catch {
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading || links.length === 0) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>{t('catalog.links')}</ThemedText>
      <ThemedView style={styles.row}>
        {links.map((link) => (
          <Pressable
            key={link.platform}
            accessibilityRole="link"
            onPress={() => {
              void WebBrowser.openBrowserAsync(link.url);
            }}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <ThemedText style={styles.chipText}>{PLATFORM_GLYPH[link.platform]}</ThemedText>
          </Pressable>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(77, 163, 255, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    gap: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
