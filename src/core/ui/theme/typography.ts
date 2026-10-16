import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  largeTitle: {
    fontFamily,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 41,
  } satisfies TextStyle,
  title: {
    fontFamily,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
  } satisfies TextStyle,
  body: {
    fontFamily,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  bodySemibold: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  } satisfies TextStyle,
  secondary: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  } satisfies TextStyle,
  secondarySemibold: {
    fontFamily,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  } satisfies TextStyle,
  footnote: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
  footnoteSemibold: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } satisfies TextStyle,
  captionUppercase: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  liveCurrentLine: {
    fontFamily,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 36,
  } satisfies TextStyle,
};
