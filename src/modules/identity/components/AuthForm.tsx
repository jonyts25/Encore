import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useSession } from '../hooks/useSession';

type AuthMode = 'login' | 'register';

export function AuthForm() {
  const { t } = useTranslation();
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async () => {
    resetFeedback();
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        setMessage(t('identity.loginSuccess'));
      } else {
        const result = await signUp(email.trim(), password, displayName.trim());
        if (result.needsEmailConfirmation) {
          setMessage(t('identity.confirmEmail'));
        } else {
          setMessage(t('identity.registerSuccess'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('identity.authError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.heading}>
        {mode === 'login' ? t('identity.loginTitle') : t('identity.registerTitle')}
      </ThemedText>

      {mode === 'register' ? (
        <TextInput
          autoCapitalize="words"
          placeholder={t('identity.displayName')}
          placeholderTextColor="#888"
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
      ) : null}

      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={t('identity.email')}
        placeholderTextColor="#888"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        autoCapitalize="none"
        autoComplete="password"
        placeholder={t('identity.password')}
        placeholderTextColor="#888"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <Button
        disabled={isSubmitting}
        title={isSubmitting ? t('common.loading') : t('identity.submit')}
        onPress={() => {
          void handleSubmit();
        }}
      />

      <View style={styles.switchRow}>
        <ThemedText>
          {mode === 'login' ? t('identity.noAccount') : t('identity.hasAccount')}
        </ThemedText>
        <Button
          title={mode === 'login' ? t('identity.register') : t('identity.login')}
          variant="secondary"
          onPress={() => {
            resetFeedback();
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        />
      </View>

      {message ? <ThemedText style={styles.success}>{message}</ThemedText> : null}
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F4F4F4',
    borderColor: '#DDD',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  success: {
    color: '#2E9B4F',
    textAlign: 'center',
  },
  switchRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
});
