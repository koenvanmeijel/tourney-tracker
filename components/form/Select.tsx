import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/context/ThemeContext';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Select<T extends string>({ options, value, onChange }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const { palette } = useTheme();
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: palette.surface, borderColor: palette.border }]}
        onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, { color: palette.onSurfaceText }]}>{selected?.label ?? value}</Text>
        <SymbolView name={{ android: 'expand_more' }} tintColor={palette.onSurfaceText} size={20} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: palette.surface }]}
            onPress={(e) => e.stopPropagation()}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  style={styles.option}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: palette.onSurfaceText },
                      isSelected && [styles.optionTextSelected, { color: palette.accent }],
                    ]}>
                    {option.label}
                  </Text>
                  {isSelected ? (
                    <SymbolView name={{ android: 'check' }} tintColor={palette.accent} size={18} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: {
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menu: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
