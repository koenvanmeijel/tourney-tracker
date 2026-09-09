import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface Option<T extends string> {
  value: T;
  label: string;
  color?: string;
  textColor?: string;
}

interface MultiSelectChipsProps<T extends string> {
  options: Option<T>[];
  values: T[];
  onChange: (values: T[]) => void;
}

export function MultiSelectChips<T extends string>({ options, values, onChange }: MultiSelectChipsProps<T>) {
  const { palette } = useTheme();

  function toggle(value: T) {
    onChange(values.includes(value) ? values.filter((existing) => existing !== value) : [...values, value]);
  }

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = values.includes(option.value);
        const color = option.color;
        return (
          <Pressable
            key={option.value}
            onPress={() => toggle(option.value)}
            style={[
              styles.chip,
              { backgroundColor: palette.surface, borderColor: palette.border },
              color && !selected && { borderColor: color },
              selected && { backgroundColor: color ?? palette.accent, borderColor: color ?? palette.accent },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: palette.onSurfaceText },
                selected && [styles.chipTextSelected, { color: option.textColor ?? palette.onAccentText }],
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    fontWeight: '600',
  },
});
