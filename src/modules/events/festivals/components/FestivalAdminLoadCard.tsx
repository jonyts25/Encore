import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Card, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import { adminUpsertFestival, lookupArtistsInCatalog } from '../api';
import {
  buildFestivalValidationSummary,
  parseFestivalImportJson,
  uniqueArtistNames,
} from '../festivalPayloadLogic';
import { resolveMissingFestivalArtists } from '../resolveLineupArtists';
import type { FestivalValidationSummary } from '../types';

export function FestivalAdminLoadCard() {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();
  const [jsonDraft, setJsonDraft] = useState('');
  const [summary, setSummary] = useState<FestivalValidationSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'validate' | 'save' | null>(null);

  const summaryText = useMemo(() => {
    if (!summary) return null;
    return t('festivals.admin.summary', {
      days: summary.dayCount,
      lineup: summary.lineupCount,
      found: summary.foundArtists.length,
      missing: summary.missingArtists.length,
    });
  }, [summary, t]);

  const onValidate = async () => {
    setParseError(null);
    setSummary(null);
    setBusy('validate');
    try {
      const payload = parseFestivalImportJson(jsonDraft);
      const catalogMatches = await lookupArtistsInCatalog(uniqueArtistNames(payload));
      setSummary(buildFestivalValidationSummary(payload, catalogMatches));
    } catch (error) {
      const key = error instanceof Error ? error.message : 'invalid_json';
      const errorKey = `festivals.admin.errors.${key}`;
      setParseError(t(errorKey, { defaultValue: t('festivals.admin.errors.invalid_json') }));
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    setParseError(null);
    setBusy('save');
    try {
      const payload = parseFestivalImportJson(jsonDraft);
      let catalogMatches = await lookupArtistsInCatalog(uniqueArtistNames(payload));
      let missing = uniqueArtistNames(payload).filter((name) => !catalogMatches[name]);

      if (missing.length > 0) {
        const outcomes = await resolveMissingFestivalArtists(missing);
        const unresolved = outcomes.filter((item) => !item.artistId);
        if (unresolved.length > 0) {
          // Best-effort: continue with RPC; unresolved stay in missing_artists response.
          void unresolved;
        }
        catalogMatches = await lookupArtistsInCatalog(uniqueArtistNames(payload));
        missing = uniqueArtistNames(payload).filter((name) => !catalogMatches[name]);
      }

      setSummary(buildFestivalValidationSummary(payload, catalogMatches));

      const result = await adminUpsertFestival(payload);
      const stillMissing = result.missing_artists ?? [];
      Alert.alert(
        t('festivals.admin.saveSuccessTitle'),
        t('festivals.admin.saveSuccessBody', {
          created: result.shows_created,
          updated: result.shows_updated,
          missing: stillMissing.length,
        })
      );
      if (stillMissing.length > 0) {
        setSummary(
          buildFestivalValidationSummary(
            payload,
            Object.fromEntries(
              uniqueArtistNames(payload).map((name) => [name, !stillMissing.includes(name)])
            )
          )
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('festivals.admin.errors.save_failed');
      if (message.includes('FORBIDDEN') || message.includes('42501')) {
        Alert.alert(t('festivals.admin.errors.forbidden'));
      } else {
        Alert.alert(t('festivals.admin.errors.save_failed'), message);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[typography.bodySemibold, { color: tokens.text }]}>{t('festivals.admin.title')}</Text>
      <Text style={[typography.footnote, { color: tokens.textSecondary }]}>{t('festivals.admin.subtitle')}</Text>
      <TextInput
        multiline
        placeholder={t('festivals.admin.jsonPlaceholder')}
        placeholderTextColor={tokens.textSecondary}
        style={[
          styles.jsonInput,
          {
            backgroundColor: tokens.background,
            borderColor: tokens.separator,
            color: tokens.text,
          },
        ]}
        value={jsonDraft}
        onChangeText={setJsonDraft}
      />
      {parseError ? (
        <Text style={[typography.footnote, { color: tokens.recording }]}>{parseError}</Text>
      ) : null}
      {summary ? (
        <View style={styles.summaryBlock}>
          <Text style={[typography.body, { color: tokens.text }]}>{summaryText}</Text>
          {summary.missingArtists.length > 0 ? (
            <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
              {t('festivals.admin.missingList', { names: summary.missingArtists.join(', ') })}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.actions}>
        <PillButton
          disabled={busy != null || jsonDraft.trim().length === 0}
          title={t('festivals.admin.validate')}
          variant="secondary"
          onPress={() => {
            void onValidate();
          }}
        />
        <PillButton
          disabled={busy != null || jsonDraft.trim().length === 0}
          title={t('festivals.admin.save')}
          onPress={() => {
            void onSave();
          }}
        />
      </View>
      {busy ? (
        <ActivityIndicator color={tokens.accent} style={{ alignSelf: 'center' }} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    gap: spacing.md,
  },
  jsonInput: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: 'SpaceMono',
    fontSize: 13,
    minHeight: 160,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  summaryBlock: {
    gap: spacing.xs,
  },
});
