import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export function Section({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.section, { backgroundColor: palette.surface }]}>{children}</View>;
}

export function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.onSurfaceText }]}>{label}</Text>
        {right}
      </View>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
});
