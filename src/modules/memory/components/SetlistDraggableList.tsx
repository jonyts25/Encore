import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { hapticImpactLight } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';

import {
  ENCORE_DIVIDER_KEY,
  reorderSetlistRows,
  type SetlistListRow,
} from '../setlistRowLogic';

const ROW_HEIGHT = 56;
const ENCORE_ROW_HEIGHT = 44;
const AUTO_SCROLL_EDGE = 72;
const AUTO_SCROLL_STEP = 10;

type SetlistDraggableListProps = {
  rows: SetlistListRow[];
  onRowsChange: (rows: SetlistListRow[]) => void;
  listRef: React.RefObject<FlatList<SetlistListRow> | null>;
  onTogglePlayed: (key: string) => void;
  onToggleHighlight: (key: string) => void;
  ListHeaderComponent?: ReactElement | null;
  ListFooterComponent?: ReactElement | null;
};

function rowHeight(row: SetlistListRow): number {
  return row.kind === 'encore' ? ENCORE_ROW_HEIGHT : ROW_HEIGHT;
}

function computeHoverIndex(rows: SetlistListRow[], fromIndex: number, translationY: number): number {
  if (translationY === 0) return fromIndex;
  let target = fromIndex;
  if (translationY > 0) {
    let remaining = translationY;
    for (let i = fromIndex + 1; i < rows.length && remaining > 0; i += 1) {
      const step = rowHeight(rows[i]!);
      if (remaining >= step / 2) {
        target = i;
        remaining -= step;
      } else {
        break;
      }
    }
  } else {
    let remaining = -translationY;
    for (let i = fromIndex - 1; i >= 0 && remaining > 0; i -= 1) {
      const step = rowHeight(rows[i]!);
      if (remaining >= step / 2) {
        target = i;
        remaining -= step;
      } else {
        break;
      }
    }
  }
  return target;
}

type DragRowProps = {
  row: SetlistListRow;
  index: number;
  isDragging: boolean;
  dragTranslateY: { value: number };
  onTogglePlayed: (key: string) => void;
  onToggleHighlight: (key: string) => void;
  onDragStart: (index: number) => void;
  onDragUpdate: (index: number, translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
};

function SetlistDragRow({
  row,
  index,
  isDragging,
  dragTranslateY,
  onTogglePlayed,
  onToggleHighlight,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: DragRowProps) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      runOnJS(hapticImpactLight)();
      runOnJS(onDragStart)(index);
      dragTranslateY.value = 0;
    })
    .onUpdate((event) => {
      runOnJS(onDragUpdate)(index, event.translationY, event.absoluteY);
    })
    .onEnd(() => {
      runOnJS(onDragEnd)();
    })
    .onFinalize(() => {
      runOnJS(onDragEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (!isDragging) {
      return { transform: [{ scale: 1 }] };
    }
    return {
      transform: [{ translateY: dragTranslateY.value }, { scale: withSpring(1.02) }],
      zIndex: 10,
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    };
  }, [isDragging]);

  if (row.kind === 'encore') {
    return (
      <Animated.View
        style={[styles.encoreRow, { borderColor: tokens.separator, backgroundColor: tokens.surface }, animatedStyle]}>
        <Text style={[typography.footnoteSemibold, styles.encoreLabel, { color: tokens.textSecondary }]}>
          {t('memory.setlist.encoreDivider')}
        </Text>
        <GestureDetector gesture={dragGesture}>
          <View accessibilityLabel={t('memory.setlist.dragHandle')} style={styles.handleHit}>
            <Ionicons color={tokens.textSecondary} name="reorder-three" size={24} />
          </View>
        </GestureDetector>
      </Animated.View>
    );
  }

  const song = row.item;
  const unplayed = !song.played;

  return (
    <Animated.View
      style={[
        styles.songRow,
        { borderColor: tokens.separator, backgroundColor: tokens.surface },
        unplayed && styles.unplayedRow,
        animatedStyle,
      ]}>
      <Pressable accessibilityLabel={t('memory.setlist.togglePlayed')} onPress={() => onTogglePlayed(song.key)}>
        <Ionicons
          color={song.played ? tokens.accent : tokens.textSecondary}
          name={song.played ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
        />
      </Pressable>
      <Text
        numberOfLines={2}
        style={[
          typography.bodySemibold,
          styles.songTitle,
          { color: tokens.text },
          unplayed && styles.unplayedTitle,
        ]}>
        {song.title}
      </Text>
      <Pressable accessibilityLabel={t('memory.setlist.toggleHighlight')} onPress={() => onToggleHighlight(song.key)}>
        <Ionicons
          color={song.isHighlight ? '#E25555' : tokens.textSecondary}
          name={song.isHighlight ? 'heart' : 'heart-outline'}
          size={22}
        />
      </Pressable>
      <GestureDetector gesture={dragGesture}>
        <View accessibilityLabel={t('memory.setlist.dragHandle')} style={styles.handleHit}>
          <Ionicons color={tokens.textSecondary} name="reorder-three" size={24} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

export function SetlistDraggableList({
  rows,
  onRowsChange,
  listRef,
  onTogglePlayed,
  onToggleHighlight,
  ListHeaderComponent,
  ListFooterComponent,
}: SetlistDraggableListProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const dragTranslateY = useSharedValue(0);
  const scrollOffsetRef = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fingerYRef = useRef(0);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  const tickAutoScroll = useCallback(() => {
    const y = fingerYRef.current;
    const list = listRef.current;
    if (!list || draggingIndexRef.current == null) return;

    if (y < AUTO_SCROLL_EDGE) {
      const next = Math.max(0, scrollOffsetRef.current - AUTO_SCROLL_STEP);
      list.scrollToOffset({ offset: next, animated: false });
      scrollOffsetRef.current = next;
    } else if (y > windowHeight - AUTO_SCROLL_EDGE) {
      const next = scrollOffsetRef.current + AUTO_SCROLL_STEP;
      list.scrollToOffset({ offset: next, animated: false });
      scrollOffsetRef.current = next;
    }
  }, [listRef, windowHeight]);

  const updateAutoScroll = useCallback(
    (absoluteY: number) => {
      fingerYRef.current = absoluteY;
      const nearEdge = absoluteY < AUTO_SCROLL_EDGE || absoluteY > windowHeight - AUTO_SCROLL_EDGE;
      if (nearEdge && !autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(tickAutoScroll, 16);
      } else if (!nearEdge) {
        stopAutoScroll();
      }
    },
    [stopAutoScroll, tickAutoScroll, windowHeight]
  );

  const finishDrag = useCallback(() => {
    stopAutoScroll();
    draggingIndexRef.current = null;
    setDraggingIndex(null);
    dragTranslateY.value = withTiming(0, { duration: 120 });
  }, [dragTranslateY, stopAutoScroll]);

  const onDragStart = useCallback(
    (index: number) => {
      draggingIndexRef.current = index;
      setDraggingIndex(index);
      dragTranslateY.value = 0;
    },
    [dragTranslateY]
  );

  const onDragUpdate = useCallback(
    (startIndex: number, translationY: number, absoluteY: number) => {
      updateAutoScroll(absoluteY);
      const from = draggingIndexRef.current ?? startIndex;
      const currentRows = rowsRef.current;
      const hover = computeHoverIndex(currentRows, from, translationY);
      dragTranslateY.value = translationY;

      if (hover !== from) {
        onRowsChange(reorderSetlistRows(currentRows, from, hover));
        draggingIndexRef.current = hover;
        setDraggingIndex(hover);
        hapticImpactLight();
      }
    },
    [dragTranslateY, onRowsChange, updateAutoScroll]
  );

  const renderRow = useCallback(
    ({ item, index }: ListRenderItemInfo<SetlistListRow>) => (
      <SetlistDragRow
        dragTranslateY={dragTranslateY}
        index={index}
        isDragging={draggingIndex === index}
        row={item}
        onDragEnd={finishDrag}
        onDragStart={onDragStart}
        onDragUpdate={onDragUpdate}
        onToggleHighlight={onToggleHighlight}
        onTogglePlayed={onTogglePlayed}
      />
    ),
    [
      dragTranslateY,
      draggingIndex,
      finishDrag,
      onDragStart,
      onDragUpdate,
      onToggleHighlight,
      onTogglePlayed,
    ]
  );

  return (
    <FlatList
      ref={listRef}
      ListFooterComponent={ListFooterComponent ?? undefined}
      ListHeaderComponent={ListHeaderComponent ?? undefined}
      data={rows}
      getItemLayout={(_, index) => {
        let offset = 0;
        for (let i = 0; i < index; i += 1) {
          offset += rowHeight(rows[i]!) + spacing.xs;
        }
        return { length: rowHeight(rows[index]!), offset, index };
      }}
      ItemSeparatorComponent={Separator}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(row) => (row.kind === 'encore' ? ENCORE_DIVIDER_KEY : row.item.key)}
      renderItem={renderRow}
      scrollEnabled={draggingIndex == null}
      scrollEventThrottle={16}
      style={{ flex: 1 }}
      onScroll={(event) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      }}
    />
  );
}

function Separator(): ReactNode {
  return <View style={{ height: spacing.xs }} />;
}

const styles = StyleSheet.create({
  encoreLabel: {
    flex: 1,
    textAlign: 'center',
  },
  encoreRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: ENCORE_ROW_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  handleHit: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 36,
  },
  songRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  songTitle: {
    flex: 1,
  },
  unplayedRow: {
    opacity: 0.45,
  },
  unplayedTitle: {
    textDecorationLine: 'line-through',
  },
});
