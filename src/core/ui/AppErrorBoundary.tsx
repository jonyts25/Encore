import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { i18n } from '@/core/i18n';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
  componentStack: string | null;
};

const SHOW_DETAILS =
  process.env.EXPO_PUBLIC_LIVE_DIAGNOSTICS?.trim().toLowerCase() === 'true' ||
  process.env.EXPO_PUBLIC_LIVE_DIAGNOSTICS?.trim() === '1';

/**
 * App-wide error screen. With EXPO_PUBLIC_LIVE_DIAGNOSTICS=true it also shows
 * the error message and the React component stack so a crash on a test device
 * can be located from a screenshot.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error?.message, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = () => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>
          {i18n.t('errors.screenTitle', { defaultValue: 'Algo salió mal' })}
        </Text>
        <Text style={styles.body}>
          {i18n.t('errors.screenBody', {
            defaultValue:
              'Toca Reintentar. Si vuelve a pasar, toma captura de esta pantalla y mándala.',
          })}
        </Text>

        {SHOW_DETAILS ? (
          <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
            <Text selectable style={styles.message}>
              {error.message}
            </Text>
            <Text selectable style={styles.stack}>
              {(componentStack ?? '').trim().split('\n').slice(0, 25).join('\n')}
            </Text>
          </ScrollView>
        ) : null}

        <Pressable accessibilityRole="button" onPress={this.reset} style={styles.button}>
          <Text style={styles.buttonText}>
            {i18n.t('errors.retry', { defaultValue: 'Reintentar' })}
          </Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  body: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C8361F',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  details: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    flexGrow: 0,
    maxHeight: '55%',
  },
  detailsContent: {
    gap: 10,
    padding: 12,
  },
  message: {
    color: '#FFB4A6',
    fontSize: 14,
    fontWeight: '600',
  },
  root: {
    backgroundColor: '#000000',
    flex: 1,
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  stack: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Menlo',
    fontSize: 11,
    lineHeight: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
});
