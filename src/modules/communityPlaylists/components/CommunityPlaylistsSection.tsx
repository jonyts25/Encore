import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme';
import { useSession } from '@/modules/identity';
import { readPreferredMusicService } from '@/modules/music/musicServicePreference';
import type { MusicStreamingService } from '@/modules/music/streamingLinks';

import {
  deleteCommunityPlaylist,
  fetchCommunityPlaylists,
  insertCommunityPlaylist,
  recordCommunityPlaylistUse,
} from '../api';
import { sortCommunityPlaylists } from '../communityPlaylistsLogic';
import { parseCommunityPlaylistUrl } from '../parseCommunityPlaylistUrl';
import type { CommunityPlaylistRow } from '../types';

type CommunityPlaylistsSectionProps = {
  artistId: string;
  tourId: string | null;
};

function serviceIconName(service: MusicStreamingService): keyof typeof FontAwesome5.glyphMap {
  switch (service) {
    case 'apple_music':
      return 'apple';
    case 'spotify':
      return 'spotify';
    case 'youtube_music':
      return 'youtube';
    default: {
      const _exhaustive: never = service;
      return _exhaustive;
    }
  }
}

function serviceBrandColor(service: MusicStreamingService): string {
  switch (service) {
    case 'apple_music':
      return '#FA233B';
    case 'spotify':
      return '#1DB954';
    case 'youtube_music':
      return '#FF0000';
    default: {
      const _exhaustive: never = service;
      return _exhaustive;
    }
  }
}

type PlaylistCardProps = {
  playlist: CommunityPlaylistRow;
  canDelete: boolean;
  onOpen: (playlist: CommunityPlaylistRow) => void;
  onDelete: (playlistId: string) => void;
  serviceLabel: (service: MusicStreamingService) => string;
  addedByLabel: (name: string) => string;
  usesLabel: (count: number) => string;
  fallbackTitle: (service: MusicStreamingService) => string;
  deleteLabel: string;
};

function PlaylistCard({
  playlist,
  canDelete,
  onOpen,
  onDelete,
  serviceLabel,
  addedByLabel,
  usesLabel,
  fallbackTitle,
  deleteLabel,
}: PlaylistCardProps) {
  const { tokens } = useEncoreTheme();
  const title = playlist.title?.trim() || fallbackTitle(playlist.service);
  const creator = playlist.creator_display_name?.trim() || 'Fan';

  const content = (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tokens.surface, borderColor: tokens.separator },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onOpen(playlist)}>
      <View style={[styles.iconWrap, { backgroundColor: `${serviceBrandColor(playlist.service)}18` }]}>
        <FontAwesome5 color={serviceBrandColor(playlist.service)} name={serviceIconName(playlist.service)} size={20} />
      </View>
      <View style={styles.cardText}>
        <Text numberOfLines={2} style={[typography.bodySemibold, { color: tokens.text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[typography.footnote, { color: tokens.textSecondary }]}>
          {serviceLabel(playlist.service)} · {addedByLabel(creator)}
        </Text>
        <Text style={[typography.footnote, { color: tokens.textSecondary }]}>{usesLabel(playlist.useCount)}</Text>
      </View>
      <Ionicons color={tokens.tabIconDefault} name="open-outline" size={18} />
    </Pressable>
  );

  if (!canDelete) return content;

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityLabel={deleteLabel}
          style={[styles.deleteAction, { backgroundColor: tokens.recording }]}
          onPress={() => onDelete(playlist.id)}>
          <Ionicons color="#fff" name="trash-outline" size={22} />
        </Pressable>
      )}>
      {content}
    </Swipeable>
  );
}

export function CommunityPlaylistsSection({ artistId, tourId }: CommunityPlaylistsSectionProps) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [addOpen, setAddOpen] = useState(false);
  const [urlRaw, setUrlRaw] = useState('');
  const [titleRaw, setTitleRaw] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ['communityPlaylists', artistId, tourId ?? 'none'] as const,
    [artistId, tourId]
  );

  const playlistsQuery = useQuery({
    queryKey,
    queryFn: () => fetchCommunityPlaylists({ artistId, tourId }),
    enabled: Boolean(artistId),
  });

  const preferredService = readPreferredMusicService();
  const playlists = useMemo(() => {
    const rows = playlistsQuery.data ?? [];
    return sortCommunityPlaylists(rows, preferredService);
  }, [playlistsQuery.data, preferredService]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const deleteMutation = useMutation({
    mutationFn: deleteCommunityPlaylist,
    onSuccess: invalidate,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('auth');
      const parsed = parseCommunityPlaylistUrl(urlRaw);
      if (!parsed.ok) {
        throw new Error(t('communityPlaylists.invalidUrl'));
      }
      return insertCommunityPlaylist({
        artistId,
        tourId,
        url: parsed.value.url,
        service: parsed.value.service,
        title: titleRaw.trim() || null,
        createdBy: userId,
      });
    },
    onSuccess: () => {
      setAddOpen(false);
      setUrlRaw('');
      setTitleRaw('');
      setFormError(null);
      invalidate();
    },
    onError: (error: Error) => {
      if (error.message === 'auth') {
        setFormError(t('communityPlaylists.requiresAuth'));
        return;
      }
      setFormError(error.message || t('communityPlaylists.saveError'));
    },
  });

  const openPlaylist = useCallback(
    async (playlist: CommunityPlaylistRow) => {
      if (userId) {
        try {
          const recorded = await recordCommunityPlaylistUse(playlist.id, userId);
          if (recorded) invalidate();
        } catch {
          // opening the link still succeeds if use logging fails
        }
      }
      void Linking.openURL(playlist.url);
    },
    [invalidate, userId]
  );

  const confirmDelete = useCallback(
    (playlistId: string) => {
      Alert.alert(t('communityPlaylists.deleteTitle'), t('communityPlaylists.deleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('communityPlaylists.deleteConfirm'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(playlistId),
        },
      ]);
    },
    [deleteMutation, t]
  );

  const serviceLabel = useCallback(
    (service: MusicStreamingService) => t(`musicStreaming.${service === 'apple_music' ? 'appleMusic' : service === 'spotify' ? 'spotify' : 'youtubeMusic'}`),
    [t]
  );

  const fallbackTitle = useCallback(
    (service: MusicStreamingService) =>
      t('communityPlaylists.fallbackTitle', { service: serviceLabel(service) }),
    [serviceLabel, t]
  );

  return (
    <View style={styles.section}>
      <Text style={[typography.bodySemibold, { color: tokens.text }]}>
        {t('communityPlaylists.title')}
      </Text>

      {playlistsQuery.isLoading ? <ActivityIndicator color={tokens.accent} style={styles.loader} /> : null}

      {!playlistsQuery.isLoading && playlists.length === 0 ? (
        <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
          {t('communityPlaylists.empty')}
        </Text>
      ) : null}

      <View style={styles.list}>
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            addedByLabel={(name) => t('communityPlaylists.addedBy', { name })}
            canDelete={userId === playlist.created_by}
            deleteLabel={t('communityPlaylists.deleteConfirm')}
            fallbackTitle={fallbackTitle}
            playlist={playlist}
            serviceLabel={serviceLabel}
            usesLabel={(count) =>
              count === 1 ? t('communityPlaylists.uses_one') : t('communityPlaylists.uses', { count })
            }
            onDelete={confirmDelete}
            onOpen={(item) => void openPlaylist(item)}
          />
        ))}
      </View>

      {addOpen ? (
        <View style={[styles.form, { borderColor: tokens.separator, backgroundColor: tokens.surface }]}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={t('communityPlaylists.urlPlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={[styles.input, { color: tokens.text, borderColor: tokens.separator }]}
            value={urlRaw}
            onChangeText={setUrlRaw}
          />
          <TextInput
            placeholder={t('communityPlaylists.titlePlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={[styles.input, { color: tokens.text, borderColor: tokens.separator }]}
            value={titleRaw}
            onChangeText={setTitleRaw}
          />
          {formError ? (
            <Text style={[typography.footnote, { color: tokens.recording }]}>{formError}</Text>
          ) : null}
          <View style={styles.formActions}>
            <PillButton
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => {
                setAddOpen(false);
                setFormError(null);
              }}
            />
            <PillButton
              disabled={addMutation.isPending}
              title={addMutation.isPending ? t('common.loading') : t('communityPlaylists.save')}
              variant="primary"
              onPress={() => addMutation.mutate()}
            />
          </View>
        </View>
      ) : (
        <PillButton
          title={t('communityPlaylists.add')}
          variant="secondary"
          onPress={() => {
            if (!userId) {
              Alert.alert(t('communityPlaylists.requiresAuth'));
              return;
            }
            setAddOpen(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  deleteAction: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 8,
    width: 72,
  },
  form: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 12,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: {
    gap: 8,
  },
  loader: {
    marginVertical: 4,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
});
