import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { useTranslation } from '@/core/i18n';
import { SectionHeader } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import type { HomeFeedItem, HomeFeedItemType } from '../homeFeedTypes';

type HomeNewsSectionProps = {
  items: HomeFeedItem[];
  onDismiss: (itemId: string) => void;
};

function feedIcon(type: HomeFeedItemType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'one_year_ago':
      return 'time-outline';
    case 'new_concert':
      return 'sparkles-outline';
    case 'tour_setlist':
      return 'musical-notes-outline';
    case 'going_count':
      return 'people-outline';
    default:
      return 'notifications-outline';
  }
}

function formatRelative(
  timestamp: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const minutes = Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000);
  if (minutes < 1) return t('events.relative.justNow');
  if (minutes < 60) return t('events.relative.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('events.relative.hoursAgo', { count: hours });
  return t('events.relative.daysAgo', { count: Math.round(hours / 24) });
}

function headlineForItem(
  item: HomeFeedItem,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  switch (item.payload.kind) {
    case 'one_year_ago':
      return t('home.news.oneYearAgo', {
        count: item.payload.yearsAgo,
        years: item.payload.yearsAgo,
        artist: item.payload.artistName,
        venue: item.payload.venueName,
      });
    case 'new_concert':
      return t('home.news.newConcert', { artist: item.payload.artistName });
    case 'tour_setlist':
      return t('home.news.tourSetlist', {
        city: item.payload.city,
        count: item.payload.songCount,
      });
    case 'going_count':
      return t('home.news.goingCount', { count: item.payload.count });
    default:
      return '';
  }
}

function HomeNewsCard({
  item,
  onDismiss,
}: {
  item: HomeFeedItem;
  onDismiss: (itemId: string) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();

  const content = (
    <Pressable
      style={[styles.card, { backgroundColor: tokens.surface }]}
      onPress={() => router.push(`/show/${item.targetShowId}`)}>
      <View style={[styles.iconWrap, { backgroundColor: tokens.fillMuted }]}>
        <Ionicons color={tokens.accent} name={feedIcon(item.type)} size={18} />
      </View>
      <Image
        contentFit="cover"
        source={item.artistImageUrl ? { uri: item.artistImageUrl } : undefined}
        style={[styles.thumb, { backgroundColor: tokens.fillMuted }]}
      />
      <View style={styles.textWrap}>
        <Text numberOfLines={2} style={[typography.body, { color: tokens.text }]}>
          {headlineForItem(item, t)}
        </Text>
        <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
          {formatRelative(item.referenceAt, t)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityLabel={t('home.news.dismiss')}
          style={[styles.dismissAction, { backgroundColor: tokens.recording }]}
          onPress={() => onDismiss(item.id)}>
          <Ionicons color="#fff" name="close" size={22} />
        </Pressable>
      )}>
      {content}
    </Swipeable>
  );
}

export function HomeNewsSection({ items, onDismiss }: HomeNewsSectionProps) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('home.news.title')} />
      <View style={styles.list}>
        {items.map((item) => (
          <HomeNewsCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  dismissAction: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 72,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  list: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  thumb: {
    borderRadius: 10,
    height: 48,
    width: 48,
  },
});
