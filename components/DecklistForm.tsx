import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { EventLinkPicker } from '@/components/EventLinkPicker';
import { Field, Section } from '@/components/form/FormSection';
import { FormTextInput } from '@/components/form/FormTextInput';
import { TagInput, type TagInputHandle } from '@/components/form/TagInput';
import { Text } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import { useTheme } from '@/context/ThemeContext';
import { EVENT_TYPE_LABELS, type NewDecklist } from '@/models/types';
import { formatIsoDateForDisplay } from '@/utils/date';

interface DecklistFormProps {
  initialValue?: NewDecklist;
  /** Ids of events currently linked to this decklist — only meaningful when editing. */
  linkedEventIds?: number[];
  submitLabel: string;
  onSubmit: (decklist: NewDecklist, linkedEventIds: number[]) => Promise<void>;
  onDelete?: () => void;
}

export function DecklistForm({
  initialValue,
  linkedEventIds: initialLinkedEventIds,
  submitLabel,
  onSubmit,
  onDelete,
}: DecklistFormProps) {
  const { palette } = useTheme();
  const { events } = useEvents();
  const [deckName, setDeckName] = useState(initialValue?.deckName ?? '');
  const [pokemonNames, setPokemonNames] = useState<string[]>(initialValue?.pokemonNames ?? []);
  const [decklistText, setDecklistText] = useState(initialValue?.decklistText ?? '');
  const [linkedEventIds, setLinkedEventIds] = useState<number[]>(initialLinkedEventIds ?? []);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pokemonNamesRef = useRef<TagInputHandle>(null);

  const linkedEvents = events.filter((event) => linkedEventIds.includes(event.id));

  function toggleEventLink(eventId: number) {
    setLinkedEventIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
    );
  }

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
      await onSubmit(
        {
          deckName: deckName.trim(),
          pokemonNames: finalPokemonNames,
          decklistText,
        },
        linkedEventIds
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save decklist');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <KeyboardAwareScrollView
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        {initialLinkedEventIds && initialLinkedEventIds.length > 0 ? (
          <View style={[styles.warningBanner, { backgroundColor: palette.dangerTint }]}>
            <Text style={[styles.warningBannerText, { color: palette.danger }]}>
              This decklist is linked to {initialLinkedEventIds.length} event{initialLinkedEventIds.length === 1 ? '' : 's'}. Changes made here will apply to all of them. You can duplicate this decklist to create a new version.
            </Text>
          </View>
        ) : null}

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

        <Section>
          <Field
            label="Linked Events"
            right={
              <Pressable
                style={[styles.pasteButton, { backgroundColor: palette.secondaryFill }]}
                onPress={() => setEventPickerOpen(true)}>
                <Text style={[styles.pasteButtonText, { color: palette.onSurfaceText }]}>+ Link events</Text>
              </Pressable>
            }>
            {linkedEvents.length > 0 ? (
              <View style={styles.linkedEventsList}>
                {linkedEvents.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => toggleEventLink(event.id)}
                    style={[styles.linkedEventChip, { backgroundColor: palette.secondaryFill }]}>
                    <Text style={[styles.linkedEventChipText, { color: palette.onSurfaceText }]}>
                      {formatIsoDateForDisplay(event.date)} · {EVENT_TYPE_LABELS[event.eventType]} ✕
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={[styles.linkedEventsEmpty, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                No events linked yet.
              </Text>
            )}
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

      <EventLinkPicker
        visible={eventPickerOpen}
        events={events}
        selectedIds={linkedEventIds}
        onToggle={toggleEventLink}
        onDone={() => setEventPickerOpen(false)}
      />
    </>
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
  warningBanner: {
    borderRadius: 10,
    padding: 12,
  },
  warningBannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  pasteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  linkedEventsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  linkedEventChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  linkedEventChipText: {
    fontSize: 13,
  },
  linkedEventsEmpty: {
    fontSize: 13.5,
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
