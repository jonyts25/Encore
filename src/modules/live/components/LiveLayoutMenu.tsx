import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import type { LiveFloatingHeight, LiveLayoutMode } from '../types';
import { LIVE_FLOATING_HEIGHTS } from '../types';

type LiveLayoutMenuProps = {
  visible: boolean;
  layoutMode: LiveLayoutMode;
  lyricsVisible: boolean;
  floatingHeight: LiveFloatingHeight;
  onClose: () => void;
  onLayoutChange: (mode: LiveLayoutMode) => void;
  onLyricsVisibleChange: (visible: boolean) => void;
  onFloatingHeightChange: (height: LiveFloatingHeight) => void;
};

const LAYOUT_OPTIONS: LiveLayoutMode[] = ['overlay', 'split', 'floating'];

export function LiveLayoutMenu({
  visible,
  layoutMode,
  lyricsVisible,
  floatingHeight,
  onClose,
  onLayoutChange,
  onLyricsVisibleChange,
  onFloatingHeightChange,
}: LiveLayoutMenuProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.menu} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{t('live.layoutMenuTitle')}</Text>

          <Pressable
            onPress={() => onLyricsVisibleChange(!lyricsVisible)}
            style={[styles.option, lyricsVisible && styles.optionActive]}>
            <Text style={styles.optionText}>
              {lyricsVisible ? t('live.hideLyrics') : t('live.showLyrics')}
            </Text>
          </Pressable>

          <Text style={styles.sectionLabel}>{t('live.layoutSection')}</Text>
          {LAYOUT_OPTIONS.map((mode) => (
            <Pressable
              key={mode}
              onPress={() => onLayoutChange(mode)}
              style={[styles.option, layoutMode === mode && styles.optionActive]}>
              <Text style={styles.optionText}>{t(`live.layout.${mode}`)}</Text>
            </Pressable>
          ))}

          {layoutMode === 'floating' ? (
            <>
              <Text style={styles.sectionLabel}>{t('live.floatingSize')}</Text>
              <View style={styles.sizeRow}>
                {LIVE_FLOATING_HEIGHTS.map((height) => (
                  <Pressable
                    key={height}
                    onPress={() => onFloatingHeightChange(height)}
                    style={[
                      styles.sizeChip,
                      floatingHeight === height && styles.sizeChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.sizeChipText,
                        floatingHeight === height && styles.sizeChipTextActive,
                      ]}>
                      {height}px
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    gap: 8,
    padding: 16,
  },
  option: {
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: '#e8f0ff',
  },
  optionText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  sizeChip: {
    backgroundColor: '#f4f4f4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sizeChipActive: {
    backgroundColor: '#111',
  },
  sizeChipText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeChipTextActive: {
    color: '#fff',
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
});
