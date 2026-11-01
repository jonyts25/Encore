import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { useSession } from '@/modules/identity';

import { LinkSetlistToShowError, linkSetlistUrlToShow } from '../linkSetlistfmShowApi';

type PastSetlistLinkSectionProps = {
  showId: string;
  onLinked: (showId: string) => void;
};

export function PastSetlistLinkSection({ showId, onLinked }: PastSetlistLinkSectionProps) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!session?.access_token || !url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await linkSetlistUrlToShow(showId, url.trim(), session.access_token);
      setOpen(false);
      setUrl('');
      onLinked(result.show_id);
    } catch (err) {
      if (err instanceof LinkSetlistToShowError) {
        if (err.code === 'date_mismatch') {
          setError(t('events.pastSetlist.dateMismatch'));
        } else if (err.code === 'invalid_url') {
          setError(t('addShow.setlistLinkInvalid'));
        } else if (err.code === 'not_found') {
          setError(t('addShow.setlistLinkNotFound'));
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : t('events.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.separator }]}>
        <Text style={[typography.bodySemibold, { color: tokens.text }]}>
          {t('events.pastSetlist.notFound')}
        </Text>
        <PillButton title={t('events.pastSetlist.pasteLink')} onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: tokens.background }]}>
            <Text style={[typography.title, { color: tokens.text }]}>
              {t('events.pastSetlist.pasteTitle')}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('addShow.setlistLinkPlaceholder')}
              placeholderTextColor={tokens.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: tokens.surface,
                  color: tokens.text,
                  borderColor: tokens.separator,
                },
              ]}
              value={url}
              onChangeText={setUrl}
            />
            {error ? <Text style={{ color: tokens.recording }}>{error}</Text> : null}
            {loading ? <ActivityIndicator color={tokens.accent} /> : null}
            <PillButton
              title={t('events.pastSetlist.pasteSubmit')}
              disabled={loading || !url.trim()}
              onPress={() => void submit()}
            />
            <PillButton title={t('common.cancel')} variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
