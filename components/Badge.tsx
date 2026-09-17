import { StyleSheet, View as RNView } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';

export function Badge({ text }: { text: string }) {
  const { palette } = useTheme();
  return (
    <RNView style={[styles.badge, { backgroundColor: palette.secondaryFill }]}>
      <Text style={[styles.badgeText, { color: palette.onSurfaceText }]}>{text}</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
