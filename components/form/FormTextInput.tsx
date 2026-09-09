import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

export const FormTextInput = forwardRef<TextInput, TextInputProps>(function FormTextInput(props, ref) {
  const { palette } = useTheme();

  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#888888"
      {...props}
      style={[
        styles.input,
        { color: palette.onSurfaceText, backgroundColor: palette.surface, borderColor: palette.border },
        props.style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
});
