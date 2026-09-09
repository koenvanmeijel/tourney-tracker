import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface Option<T extends string> {
  value: T;
  label: string;
  color?: string;
  textColor?: string;
}

interface SelectChipsProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  initialVisibleCount?: number;
}

export function SelectChips<T extends string>({
  options,
  value,
  onChange,
  initialVisibleCount,
}: SelectChipsProps<T>) {
  const { palette } = useTheme();
  const collapsible = initialVisibleCount != null && options.length > initialVisibleCount;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedIsHidden = collapsible && selectedIndex >= initialVisibleCount;
  const [expanded, setExpanded] = useState(!collapsible || selectedIsHidden);

  const visibleOptions = collapsible && !expanded ? options.slice(0, initialVisibleCount) : options;

  return (
    <View style={styles.wrap}>
      {visibleOptions.map((option) => {
        const selected = option.value === value;
        const color = option.color;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
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
      {collapsible && !expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.chipText, { color: palette.onSurfaceText }]}>…</Text>
        </Pressable>
      ) : null}
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
