import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clearLocalUserData } from '@/core/db/clearLocalUserData';
import { useTranslation, type SupportedLocale } from '@/core/i18n';
import { Card, ListRow, PillButton, SegmentedControl } from '@/core/ui';
import { useEncoreTheme, type ThemePreference } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import { deleteMyAccount, upsertProfile } from '../api';
import { PRIVACY_NOTICE_URL, SUPPORT_REPORT_PROBLEM_URL, SUPPORT_WHATSAPP_URL } from '../supportLinks';
import { applyProfileLocale, updateLastKnownDisplayName } from '../SessionProvider';
import { useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';
import { FestivalAdminLoadCard } from '@/modules/events/festivals/components/FestivalAdminLoadCard';

import { AppearanceSettings } from './AppearanceSettings';

const TAB_BAR_CLEARANCE = 72;

export function SettingsScreenContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { user, signOut, isOfflineSession } = useSession();
  const { profile, refetch, role } = useProfile();

  const [nameDraft, setNameDraft] = useState(profile?.display_name ?? '');

  useEffect(() => {
    setNameDraft(profile?.display_name ?? '');
  }, [profile?.display_name]);
  const [savingName, setSavingName] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const locale: SupportedLocale = i18n.language.startsWith('en') ? 'en' : 'es';

  const versionLabel = Constants.expoConfig?.version ?? '0.1.0';
  const fingerprintLabel = Updates.updateId ?? Updates.runtimeVersion ?? '—';

  const reportUrl = useMemo(() => {
    if (SUPPORT_REPORT_PROBLEM_URL) return SUPPORT_REPORT_PROBLEM_URL;
    return SUPPORT_WHATSAPP_URL || null;
  }, []);

  const saveDisplayName = async () => {
    if (!user || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      await upsertProfile(user.id, {
        display_name: nameDraft.trim(),
        locale: profile?.locale ?? locale,
        home_city: profile?.home_city ?? null,
      });
      updateLastKnownDisplayName(nameDraft.trim());
      await refetch();
    } catch {
      Alert.alert(t('identity.authError'));
    } finally {
      setSavingName(false);
    }
  };

  const onLocaleChange = async (next: SupportedLocale) => {
    applyProfileLocale(next);
    if (!user || isOfflineSession) return;
    try {
      await upsertProfile(user.id, {
        display_name: (profile?.display_name ?? nameDraft.trim()) || 'Fan',
        locale: next,
        home_city: profile?.home_city ?? null,
      });
      await refetch();
    } catch {
      // locale already applied locally
    }
  };

  const openReport = () => {
    if (!reportUrl) return;
    void Linking.openURL(reportUrl);
  };

  const openPrivacy = () => {
    if (!PRIVACY_NOTICE_URL) return;
    void Linking.openURL(PRIVACY_NOTICE_URL);
  };

  const performDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      await clearLocalUserData(user.id);
      await signOut();
      router.replace('/(tabs)/profile');
    } catch {
      Alert.alert(t('settings.deleteAccountFailed'));
    } finally {
      setDeleting(false);
      setDeleteStep(0);
      setDeleteConfirmText('');
    }
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.background }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.screenHorizontal,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          gap: spacing.xl,
        }}>
        <Text style={[typography.largeTitle, { color: tokens.text }]}>{t('settings.title')}</Text>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: tokens.textSecondary }]}>{t('settings.accountGroup')}</Text>
          <Card>
            <Text style={[typography.footnote, { color: tokens.textSecondary }]}>{t('identity.displayName')}</Text>
            <TextInput
              editable={!isOfflineSession}
              placeholder={t('identity.displayName')}
              placeholderTextColor={tokens.textSecondary}
              style={[styles.input, { color: tokens.text, borderColor: tokens.separator }]}
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={() => {
                if (nameDraft.trim() !== (profile?.display_name ?? '')) {
                  void saveDisplayName();
                }
              }}
            />
            {savingName ? (
              <Text style={[typography.footnote, { color: tokens.textSecondary }]}>{t('common.loading')}</Text>
            ) : null}
            <ListRow title={user?.email ?? '—'} subtitle={t('identity.email')} />
          </Card>
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: tokens.textSecondary }]}>
            {t('settings.preferencesGroup')}
          </Text>
          <Card style={{ gap: spacing.md }}>
            <View style={styles.row}>
              <Text style={[typography.bodySemibold, { color: tokens.text, flex: 1 }]}>
                {t('settings.language')}
              </Text>
              <SegmentedControl<SupportedLocale>
                options={[
                  { value: 'es', label: t('settings.spanish') },
                  { value: 'en', label: t('settings.english') },
                ]}
                value={locale}
                onChange={(next) => {
                  void onLocaleChange(next);
                }}
              />
            </View>
            <AppearanceSettings />
          </Card>
        </View>

        {role === 'admin' && !isOfflineSession ? (
          <View style={styles.group}>
            <Text style={[styles.groupTitle, { color: tokens.textSecondary }]}>
              {t('festivals.admin.groupTitle')}
            </Text>
            <FestivalAdminLoadCard />
          </View>
        ) : null}

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: tokens.textSecondary }]}>{t('settings.helpGroup')}</Text>
          <Card padded={false}>
            {reportUrl ? (
              <ListRow title={t('settings.reportProblem')} onPress={openReport} />
            ) : null}
            {PRIVACY_NOTICE_URL ? (
              <ListRow title={t('settings.privacyNotice')} onPress={openPrivacy} />
            ) : null}
          </Card>
        </View>

        <PillButton
          title={t('identity.logout')}
          variant="secondary"
          onPress={() => {
            void signOut();
          }}
        />

        {!isOfflineSession ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDeleteStep(1)}
            style={styles.deleteLink}>
            <Text style={[typography.bodySemibold, { color: tokens.recording }]}>
              {t('settings.deleteAccount')}
            </Text>
          </Pressable>
        ) : null}

        <Text style={[typography.footnote, styles.meta, { color: tokens.textSecondary }]}>
          {t('settings.versionLine', { version: versionLabel, fingerprint: fingerprintLabel })}
        </Text>
      </ScrollView>

      <Modal animationType="fade" transparent visible={deleteStep > 0} onRequestClose={() => setDeleteStep(0)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: tokens.surface }]}>
            {deleteStep === 1 ? (
              <>
                <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                  {t('settings.deleteAccountConfirmTitle')}
                </Text>
                <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
                  {t('settings.deleteAccountConfirmBody')}
                </Text>
                <View style={styles.modalActions}>
                  <PillButton title={t('common.close')} variant="secondary" onPress={() => setDeleteStep(0)} />
                  <PillButton title={t('settings.continue')} onPress={() => setDeleteStep(2)} />
                </View>
              </>
            ) : (
              <>
                <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                  {t('settings.deleteAccountTypePrompt')}
                </Text>
                <TextInput
                  autoCapitalize="characters"
                  placeholder="ELIMINAR"
                  placeholderTextColor={tokens.textSecondary}
                  style={[styles.input, { color: tokens.text, borderColor: tokens.separator }]}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                />
                <View style={styles.modalActions}>
                  <PillButton title={t('common.close')} variant="secondary" onPress={() => setDeleteStep(0)} />
                  <PillButton
                    disabled={deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR' || deleting}
                    title={t('settings.deleteAccount')}
                    onPress={() => {
                      void performDelete();
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  deleteLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.captionUppercase,
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  meta: {
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    borderRadius: 22,
    gap: spacing.md,
    padding: spacing.xl,
  },
  row: {
    gap: spacing.sm,
  },
});
