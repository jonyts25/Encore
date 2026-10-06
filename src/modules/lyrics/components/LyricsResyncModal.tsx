import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button } from '@/core/ui/Themed';

type LyricsResyncModalProps = {
  visible: boolean;
  lines: string[];
  activeLineIndex: number;
  onClose: () => void;
  onSelectLine: (index: number) => void;
};

export function LyricsResyncModal({
  visible,
  lines,
  activeLineIndex,
  onClose,
  onSelectLine,
}: LyricsResyncModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('lyrics.resyncTitle')}</Text>
          <Text style={styles.subtitle}>{t('lyrics.resyncHint')}</Text>

          <ScrollView contentContainerStyle={styles.list} style={styles.listScroll}>
            {lines.map((line, index) => {
              const selected = index === activeLineIndex;
              return (
                <Pressable
                  key={`${index}-${line}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelectLine(index);
                    onClose();
                  }}
                  style={[styles.lineRow, selected && styles.lineRowSelected]}>
                  <Text style={[styles.lineIndex, selected && styles.lineIndexSelected]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.lineText, selected && styles.lineTextSelected]} numberOfLines={3}>
                    {line}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button title={t('common.close')} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  lineIndex: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    width: 28,
  },
  lineIndexSelected: {
    color: '#ffe566',
  },
  lineRow: {
    alignItems: 'flex-start',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  lineRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lineText: {
    color: '#fff',
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.85,
  },
  lineTextSelected: {
    fontWeight: '700',
    opacity: 1,
  },
  list: {
    gap: 4,
    paddingVertical: 8,
  },
  listScroll: {
    maxHeight: 360,
  },
  sheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
