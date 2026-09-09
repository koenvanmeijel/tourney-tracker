import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export function Section({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.section, { backgroundColor: palette.surface }]}>{children}</View>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.onSurfaceText }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
});
