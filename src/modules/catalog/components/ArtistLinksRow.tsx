import { FontAwesome5 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useEncoreTheme } from '@/core/ui/theme';

import { fetchArtistLinks } from '../api';
import type { ArtistLink, ArtistLinkPlatform } from '../types';

type ArtistLinksRowProps = {
  artistId: string;
};

const LINK_ORDER: ArtistLinkPlatform[] = ['apple_music', 'spotify', 'website', 'youtube'];

function platformIcon(platform: (typeof LINK_ORDER)[number]): {
  name: keyof typeof FontAwesome5.glyphMap;
  color: string;
} {
  switch (platform) {
    case 'apple_music':
      return { name: 'apple', color: '#FA233B' };
    case 'spotify':
      return { name: 'spotify', color: '#1DB954' };
    case 'website':
      return { name: 'globe', color: '#6B7280' };
    case 'youtube':
      return { name: 'youtube', color: '#FF0000' };
    default:
      return { name: 'globe', color: '#6B7280' };
  }
}

export function ArtistLinksRow({ artistId }: ArtistLinksRowProps) {
  const { tokens } = useEncoreTheme();
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

  const orderedLinks = useMemo(() => {
    const byPlatform = new Map(links.map((link) => [link.platform, link]));
    return LINK_ORDER.map((platform) => byPlatform.get(platform)).filter(
      (link): link is ArtistLink => link != null
    );
  }, [links]);

  if (isLoading || orderedLinks.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {orderedLinks.map((link) => {
        if (!LINK_ORDER.includes(link.platform as (typeof LINK_ORDER)[number])) return null;
        const icon = platformIcon(link.platform as (typeof LINK_ORDER)[number]);
        return (
          <Pressable
            key={link.platform}
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: tokens.surface, borderColor: tokens.separator },
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void WebBrowser.openBrowserAsync(link.url);
            }}>
            <FontAwesome5 color={icon.color} name={icon.name} size={18} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
});
