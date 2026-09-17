import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Select } from '@/components/form/Select';
import { useTheme } from '@/context/ThemeContext';

interface RoundDividerButtonProps {
  roundCount: number;
  dividers: number[];
  onAdd: (afterRound: number) => void;
}

export function RoundDividerButton({ roundCount, dividers, onAdd }: RoundDividerButtonProps) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const availableRounds = Array.from({ length: roundCount }, (_, i) => i + 1).filter(
    (roundNumber) => !dividers.includes(roundNumber)
  );
  const [selected, setSelected] = useState('');
  const disabled = roundCount === 0;

  useEffect(() => {
    if (open) {
      setSelected(String(availableRounds[0] ?? ''));
    }
    // Only reset when the dialog opens, not on every availableRounds change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleAdd() {
    const value = Number(selected);
    if (Number.isInteger(value) && value >= 1) {
      onAdd(value);
    }
    setOpen(false);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} disabled={disabled} hitSlop={8}>
        <SymbolView
          name={{ android: 'horizontal_split' }}
          tintColor={disabled ? palette.tabIconInactive : palette.accent}
          size={22}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.title, { color: palette.onSurfaceText }]}>Add divider</Text>

            {availableRounds.length > 0 ? (
              <>
                <Text style={[styles.subtitle, { color: palette.onSurfaceText }]}>Insert after round</Text>
                <Select
                  options={availableRounds.map((roundNumber) => ({
                    value: String(roundNumber),
                    label: `Round ${roundNumber}`,
                  }))}
                  value={selected}
                  onChange={setSelected}
                />
              </>
            ) : (
              <Text style={[styles.subtitle, { color: palette.onSurfaceText }]}>
                Every round already has a divider after it.
              </Text>
            )}

            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, { backgroundColor: palette.secondaryFill }]} onPress={() => setOpen(false)}>
                <Text style={[styles.cancelButtonText, { color: palette.onSurfaceText }]}>Cancel</Text>
              </Pressable>
              {availableRounds.length > 0 ? (
                <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={handleAdd}>
                  <Text style={[styles.confirmButtonText, { color: palette.onAccentText }]}>Add</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
  },
  confirmButtonText: {
    fontWeight: '700',
  },
});
