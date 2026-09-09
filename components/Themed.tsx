import { Text as DefaultText, View as DefaultView } from 'react-native';

import type { Palette } from '@/constants/themes';
import { useTheme } from '@/context/ThemeContext';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function useThemeColor<K extends keyof Palette>(colorName: K): Palette[K] {
  const { palette } = useTheme();
  return palette[colorName];
}

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  const color = useThemeColor('text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;
  const backgroundColor = useThemeColor('background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
