import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';

import { useShowMemory } from '../hooks/useShowMemory';

type ShowMemoryBlockProps = {
  showId: string;
};

export function ShowMemoryBlock({ showId }: ShowMemoryBlockProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { memory, isLoading } = useShowMemory(showId, true);

  if (isLoading) return null;

  const confirmed = Boolean(memory?.setlist_confirmed_at);
  const songCount = memory?.songs.length ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.separator }]}>
      <Text style={[typography.title, { color: tokens.text }]}>{t('memory.summary.title')}</Text>
      {confirmed ? (
        <>
          {memory?.rating ? (
            <Text style={[typography.body, { color: tokens.textSecondary }]}>
              {t('memory.summary.rating', { rating: memory.rating })}
            </Text>
          ) : null}
          <Text style={[typography.body, { color: tokens.textSecondary }]}>
            {t('memory.summary.songCount', { count: songCount })}
          </Text>
          <PillButton
            title={t('memory.summary.viewSetlist')}
            variant="secondary"
            onPress={() => router.push(`/show/${showId}/setlist`)}
          />
        </>
      ) : (
        <PillButton
          title={t('memory.summary.whatTheyPlayed')}
          variant="primary"
          onPress={() => router.push(`/show/${showId}/setlist`)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginTop: 8,
    padding: 12,
  },
});
