import { useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Field, Section } from '@/components/form/FormSection';
import { FormTextInput } from '@/components/form/FormTextInput';
import { TagInput, type TagInputHandle } from '@/components/form/TagInput';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import type { NewDecklist } from '@/models/types';

interface DecklistFormProps {
  initialValue?: NewDecklist;
  submitLabel: string;
  onSubmit: (decklist: NewDecklist) => Promise<void>;
  onDelete?: () => void;
}

export function DecklistForm({ initialValue, submitLabel, onSubmit, onDelete }: DecklistFormProps) {
  const { palette } = useTheme();
  const [deckName, setDeckName] = useState(initialValue?.deckName ?? '');
  const [pokemonNames, setPokemonNames] = useState<string[]>(initialValue?.pokemonNames ?? []);
  const [decklistText, setDecklistText] = useState(initialValue?.decklistText ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pokemonNamesRef = useRef<TagInputHandle>(null);

  async function handlePaste() {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setDecklistText(text);
    }
  }

  async function handleSubmit() {
    const finalPokemonNames = pokemonNamesRef.current?.flush() ?? pokemonNames;

    if (!deckName.trim()) {
      setFormError('Deck name is required.');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      await onSubmit({
        deckName: deckName.trim(),
        pokemonNames: finalPokemonNames,
        decklistText,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save decklist');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}>
      <Section>
        <Field label="Deck Name">
          <FormTextInput value={deckName} onChangeText={setDeckName} placeholder="e.g. Charizard ex" />
        </Field>

        <Field label="Pokémon (optional)">
          <TagInput ref={pokemonNamesRef} tags={pokemonNames} onChange={setPokemonNames} />
        </Field>

        <Field
          label="Decklist"
          right={
            <Pressable style={[styles.pasteButton, { backgroundColor: palette.secondaryFill }]} onPress={handlePaste}>
              <Text style={[styles.pasteButtonText, { color: palette.onSurfaceText }]}>Paste from clipboard</Text>
            </Pressable>
          }>
          <FormTextInput
            value={decklistText}
            onChangeText={setDecklistText}
            placeholder="Paste or type your decklist here"
            multiline
            numberOfLines={18}
            style={styles.decklistInput}
          />
        </Field>
      </Section>

      {formError ? <Text style={[styles.errorText, { color: palette.danger }]}>{formError}</Text> : null}

      <Pressable
        style={[styles.submitButton, { backgroundColor: palette.accent, shadowColor: palette.accent }]}
        onPress={handleSubmit}
        disabled={saving}>
        <Text style={[styles.submitButtonText, { color: palette.onAccentText }]}>
          {saving ? 'Saving…' : submitLabel}
        </Text>
      </Pressable>

      {onDelete ? (
        <Pressable
          style={[styles.deleteButton, { backgroundColor: palette.dangerTint }]}
          onPress={onDelete}>
          <Text style={[styles.deleteButtonText, { color: palette.danger }]}>Delete decklist</Text>
        </Pressable>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 48,
    gap: 14,
  },
  decklistInput: {
    minHeight: 220,
    textAlignVertical: 'top',
  },
  pasteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pasteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
  },
  submitButton: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '700',
  },
});
