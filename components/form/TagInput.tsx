import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormTextInput } from '@/components/form/FormTextInput';
import { useTheme } from '@/context/ThemeContext';

export interface TagInputHandle {
  flush: () => string[];
  focus: () => void;
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  trailingAction?: { label: string; onPress: () => void };
}

export const TagInput = forwardRef<TagInputHandle, TagInputProps>(function TagInput(
  { tags, onChange, placeholder, trailingAction },
  ref
) {
  const { palette } = useTheme();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  function commit(value: string): string[] {
    if (value && !tags.includes(value)) {
      const next = [...tags, value];
      onChange(next);
      return next;
    }
    return tags;
  }

  function addTag() {
    commit(draft.trim());
    setDraft('');
  }

  useImperativeHandle(ref, () => ({
    flush() {
      const next = commit(draft.trim());
      setDraft('');
      return next;
    },
    focus() {
      inputRef.current?.focus();
    },
  }));

  function removeTag(tag: string) {
    onChange(tags.filter((existing) => existing !== tag));
  }

  return (
    <View>
      {tags.length > 0 ? (
        <View style={styles.tagList}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => removeTag(tag)}
              style={[styles.tag, { backgroundColor: palette.secondaryFill }]}>
              <Text style={[styles.tagText, { color: palette.onSurfaceText }]}>{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <FormTextInput
          ref={inputRef}
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder ?? 'Pokémon name'}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <Pressable style={[styles.addButton, { backgroundColor: palette.secondaryFill }]} onPress={addTag}>
          <Text style={[styles.addButtonText, { color: palette.onSurfaceText }]}>Add</Text>
        </Pressable>
        {trailingAction ? (
          <Pressable
            style={[styles.addButton, { backgroundColor: palette.secondaryFill }]}
            onPress={trailingAction.onPress}>
            <Text style={[styles.addButtonText, { color: palette.onSurfaceText }]}>{trailingAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
