import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MARKER_COLORS } from '@/utils/markerColors';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <View style={styles.row}>
      {MARKER_COLORS.map((swatch) => {
        const selected = swatch.value === value;
        const backgroundColor = swatch.value;
        return (
          <Pressable
            key={swatch.value}
            onPress={() => onChange(swatch.value)}
            style={[styles.swatch, { backgroundColor }]}
            accessibilityLabel={swatch.label}
            accessibilityState={{ selected }}>
            {selected ? <SymbolView name={{ android: 'check' }} tintColor={swatch.onColor} size={18} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
