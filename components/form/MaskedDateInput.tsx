import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { MaskedTextInput } from 'react-native-mask-text';

import { useTheme } from '@/context/ThemeContext';

interface MaskedDateInputProps {
  defaultValue: string;
  onChangeText: (masked: string, digits: string) => void;
  style?: StyleProp<TextStyle>;
}

export function MaskedDateInput({ defaultValue, onChangeText, style }: MaskedDateInputProps) {
  const { palette } = useTheme();

  return (
    <MaskedTextInput
      type="date"
      mask="99/99/9999"
      options={{ dateFormat: 'DD/MM/YYYY' }}
      defaultValue={defaultValue}
      onChangeText={onChangeText}
      placeholder="DD/MM/YYYY"
      placeholderTextColor="#888888"
      keyboardType="number-pad"
      style={[
        styles.input,
        { color: palette.onSurfaceText, backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
});
