import { StyleSheet, Text, View, type TextProps } from 'react-native';

const STROKE_OFFSETS: Array<[number, number]> = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
  [-1.5, -1.5],
  [1.5, -1.5],
  [-1.5, 1.5],
  [1.5, 1.5],
];

type LyricsOutlineTextProps = TextProps & {
  children: string;
  active?: boolean;
  compact?: boolean;
};

export function LyricsOutlineText({
  children,
  active = false,
  compact = false,
  style,
  ...props
}: LyricsOutlineTextProps) {
  const textStyle = [
    compact ? styles.compactText : styles.text,
    active && styles.activeText,
    style,
  ];

  return (
    <View style={[styles.wrapper, !active && styles.inactive]}>
      {STROKE_OFFSETS.map(([left, top]) => (
        <Text
          key={`${left}-${top}`}
          {...props}
          style={[
            textStyle,
            styles.stroke,
            { left, top, position: 'absolute' },
          ]}>
          {children}
        </Text>
      ))}
      <Text {...props} style={[textStyle, styles.fill]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  activeText: {
    fontWeight: '800',
  },
  compactText: {
    fontSize: 15,
    lineHeight: 22,
  },
  fill: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  inactive: {
    opacity: 0.72,
  },
  stroke: {
    color: '#000000',
  },
  text: {
    fontSize: 17,
    lineHeight: 28,
  },
  wrapper: {
    position: 'relative',
  },
});
