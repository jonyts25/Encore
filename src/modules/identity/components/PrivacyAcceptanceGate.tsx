import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import { acceptPrivacyNotice } from '../api';
import { openPrivacyNoticeInBrowser } from '../privacyNotice';
import { useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';

export function PrivacyAcceptanceGate() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { user, isGuest, isOfflineSession, signOut } = useSession();
  const { profile, isLoading, refetch } = useProfile();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAcceptance =
    !isGuest &&
    !isOfflineSession &&
    Boolean(user) &&
    !isLoading &&
    profile != null &&
    profile.privacy_accepted_at == null;

  if (!needsAcceptance) {
    return null;
  }

  const onAccept = async () => {
    if (!user || !checked || saving) return;
    setSaving(true);
    setError(null);
    try {
      await acceptPrivacyNotice(user.id);
      await refetch();
    } catch {
      setError(t('privacy.acceptError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible>
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.background, paddingTop: insets.top + spacing.md },
        ]}>
        <Text style={[typography.title, { color: tokens.text }]}>{t('privacy.gateTitle')}</Text>
        <Text style={[typography.body, styles.body, { color: tokens.textSecondary }]}>
          {t('privacy.gateBody')}
        </Text>

        <PrivacyConsentRow
          checked={checked}
          label={t('privacy.consentLabel')}
          linkLabel={t('privacy.consentLink')}
          onOpenPrivacy={() => void openPrivacyNoticeInBrowser(i18n.language.startsWith('en') ? 'en' : 'es')}
          onToggle={() => setChecked((value) => !value)}
        />

        {error ? (
          <Text style={[typography.footnote, { color: tokens.recording }]}>{error}</Text>
        ) : null}

        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
          <PillButton
            disabled={!checked || saving}
            title={saving ? t('common.loading') : t('privacy.acceptContinue')}
            onPress={() => void onAccept()}
          />
          <PillButton
            title={t('identity.logout')}
            variant="secondary"
            onPress={() => void signOut()}
          />
        </View>
      </View>
    </Modal>
  );
}

type PrivacyConsentRowProps = {
  checked: boolean;
  label: string;
  linkLabel: string;
  onToggle: () => void;
  onOpenPrivacy: () => void;
};

export function PrivacyConsentRow({
  checked,
  label,
  linkLabel,
  onToggle,
  onOpenPrivacy,
}: PrivacyConsentRowProps) {
  const { tokens } = useEncoreTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.consentRow}
      onPress={onToggle}>
      <Ionicons
        color={checked ? tokens.accent : tokens.textSecondary}
        name={checked ? 'checkbox' : 'square-outline'}
        size={24}
      />
      <Text style={[typography.body, styles.consentText, { color: tokens.text }]}>
        {label}{' '}
        <Text
          accessibilityRole="link"
          style={{ color: tokens.accent, textDecorationLine: 'underline' }}
          onPress={(event) => {
            event.stopPropagation();
            onOpenPrivacy();
          }}>
          {linkLabel}
        </Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: 'auto',
  },
  body: {
    marginTop: spacing.sm,
  },
  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  consentText: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
  },
});
