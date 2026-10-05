import { Pressable, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { useShowChecklist } from '../hooks/useShowChecklist';
import type { ChecklistItemId } from '../types';

type PrepChecklistProps = {
  showId: string;
  enabled: boolean;
};

export function PrepChecklist({ showId, enabled }: PrepChecklistProps) {
  const { t } = useTranslation();
  const { items, isLoading, error, toggleItem, reset } = useShowChecklist(showId, enabled);

  if (!enabled) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText style={styles.sectionLabel}>{t('prep.checklist.title')}</ThemedText>
        <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => void reset()}>
          <ThemedText style={styles.resetAction}>{t('prep.checklist.reset')}</ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedText style={styles.subtitle}>{t('prep.checklist.subtitle')}</ThemedText>

      {isLoading && items.length === 0 ? (
        <ThemedText>{t('common.loading')}</ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              checked={item.checked}
              disabled={isLoading}
              label={t(`prep.checklist.items.${item.id}`)}
              onToggle={() => void toggleItem(item.id as ChecklistItemId)}
            />
          ))}
        </ThemedView>
      )}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

type ChecklistRowProps = {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
};

function ChecklistRow({ label, checked, disabled, onToggle }: ChecklistRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        checked && styles.rowChecked,
        pressed && !disabled && styles.rowPressed,
      ]}>
      <ThemedView style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
      </ThemedView>
      <ThemedText style={[styles.rowLabel, checked && styles.rowLabelChecked]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderColor: '#B8C0CC',
    borderRadius: 8,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: '#2E9B4F',
    borderColor: '#2E9B4F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    gap: 8,
  },
  error: {
    color: '#D64545',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: {
    gap: 8,
  },
  resetAction: {
    color: '#3B6FD9',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    borderColor: '#E2E6EE',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowChecked: {
    backgroundColor: '#F4FBF6',
    borderColor: '#B9E4C7',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowLabelChecked: {
    opacity: 0.65,
    textDecorationLine: 'line-through',
  },
  rowPressed: {
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
  },
});
