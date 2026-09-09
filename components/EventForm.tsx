import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Field, Section } from '@/components/form/FormSection';
import { FormTextInput } from '@/components/form/FormTextInput';
import { MaskedDateInput } from '@/components/form/MaskedDateInput';
import { RoundsEditor, type RoundsEditorHandle } from '@/components/form/RoundsEditor';
import { SelectChips } from '@/components/form/SelectChips';
import { TagInput, type TagInputHandle } from '@/components/form/TagInput';
import { Text } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import type { EventType, NewEvent, NewRound } from '@/models/types';
import {
  dateToDigits,
  formatDateInput,
  parseDateDigits,
  parseIsoDateString,
  toIsoDateString,
} from '@/utils/date';
import { getEventTypeOptions, PRIZE_ICON_COLOR } from '@/utils/eventTheme';

const PRIZE_PILL_MIN_WIDTH = 92;

interface EventFormProps {
  initialValue?: NewEvent;
  submitLabel: string;
  onSubmit: (event: NewEvent) => Promise<void>;
  onAddMarker?: () => void;
}

export function EventForm({ initialValue, submitLabel, onSubmit, onAddMarker }: EventFormProps) {
  const { palette, themeId } = useTheme();
  const eventTypeOptions = useMemo(() => getEventTypeOptions(themeId), [themeId]);
  const initialDate = initialValue?.date ? parseIsoDateString(initialValue.date) ?? new Date() : new Date();
  const [date, setDate] = useState(formatDateInput(initialDate));
  const [dateDigits, setDateDigits] = useState(dateToDigits(initialDate));
  const [dateResetToken, setDateResetToken] = useState(0);
  const [eventType, setEventType] = useState<EventType>(initialValue?.eventType ?? 'local');
  const [location, setLocation] = useState(initialValue?.location ?? '');
  const [deckPokemon, setDeckPokemon] = useState<string[]>(initialValue?.deckPokemon ?? []);
  const [deckName, setDeckName] = useState(initialValue?.deckName ?? '');
  const [deckNameVisible, setDeckNameVisible] = useState(!!initialValue?.deckName);
  const [placement, setPlacement] = useState(
    initialValue?.placement != null ? String(initialValue.placement) : ''
  );
  const [placementTotal, setPlacementTotal] = useState(
    initialValue?.placementTotal != null ? String(initialValue.placementTotal) : ''
  );
  const [prized, setPrized] = useState(initialValue?.prizeTier === 'prize' || initialValue?.prizeTier === 'first');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [rounds, setRounds] = useState<NewRound[]>(initialValue?.rounds ?? []);
  const [saving, setSaving] = useState(false);
  const deckPokemonRef = useRef<TagInputHandle>(null);
  const roundsEditorRef = useRef<RoundsEditorHandle>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isFirstPlace = Number(placement.trim()) === 1;

  function applyDate(selectedDate: Date) {
    setDate(formatDateInput(selectedDate));
    setDateDigits(dateToDigits(selectedDate));
    setDateResetToken((token) => token + 1);
  }

  function openDatePicker() {
    DateTimePickerAndroid.open({
      value: parseDateDigits(dateDigits) ?? new Date(),
      mode: 'date',
      onValueChange: (_event, selectedDate) => applyDate(selectedDate),
    });
  }

  function handleDateChange(masked: string, digits: string) {
    setDate(masked);
    setDateDigits(digits);
  }

  async function handleSubmit() {
    const parsedDate = parseDateDigits(dateDigits);
    if (!parsedDate) {
      setFormError('Enter a complete, valid date.');
      return;
    }
    const placementValue = placement.trim() ? Number(placement) : null;
    if (placement.trim() && (!Number.isInteger(placementValue) || (placementValue ?? 0) < 1)) {
      setFormError('Placement must be a positive whole number.');
      return;
    }
    const placementTotalValue = placementTotal.trim() ? Number(placementTotal) : null;
    if (
      placementTotal.trim() &&
      (!Number.isInteger(placementTotalValue) || (placementTotalValue ?? 0) < 1)
    ) {
      setFormError('Total players must be a positive whole number.');
      return;
    }

    const finalDeckPokemon = deckPokemonRef.current?.flush() ?? deckPokemon;
    const finalRounds = roundsEditorRef.current?.flush() ?? rounds;

    setFormError(null);
    setSaving(true);
    try {
      await onSubmit({
        date: toIsoDateString(parsedDate),
        eventType,
        location: location.trim() || null,
        deckName: deckName.trim() || null,
        deckPokemon: finalDeckPokemon,
        placement: placementValue,
        placementTotal: placementTotalValue,
        prizeTier: placementValue === 1 ? 'first' : prized ? 'prize' : 'none',
        notes: notes.trim() || null,
        rounds: finalRounds.map((round, index) => ({ ...round, roundNumber: index + 1 })),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save event');
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
        <Field label="Date">
          <View style={styles.dateRow}>
            <MaskedDateInput
              key={dateResetToken}
              style={styles.dateInput}
              defaultValue={date}
              onChangeText={handleDateChange}
            />
            <Pressable style={[styles.dateButton, { backgroundColor: palette.accentTint }]} onPress={openDatePicker}>
              <Text style={[styles.dateButtonText, { color: palette.accent }]}>📅 Pick</Text>
            </Pressable>
            <Pressable
              style={[styles.dateButton, { backgroundColor: palette.accentTint }]}
              onPress={() => applyDate(new Date())}>
              <Text style={[styles.dateButtonText, { color: palette.accent }]}>Today</Text>
            </Pressable>
          </View>
        </Field>

        <Field label="Event type">
          <SelectChips options={eventTypeOptions} value={eventType} onChange={setEventType} initialVisibleCount={3} />
        </Field>

        <Field label="Location">
          <FormTextInput value={location} onChangeText={setLocation} placeholder="Location" />
        </Field>
      </Section>

      <Section>
        <Field label="Deck Pokémon">
          <TagInput
            ref={deckPokemonRef}
            tags={deckPokemon}
            onChange={setDeckPokemon}
            trailingAction={{
              label: deckNameVisible ? 'Remove name' : '+ Name',
              onPress: () => {
                if (deckNameVisible) setDeckName('');
                setDeckNameVisible((visible) => !visible);
              },
            }}
          />
          {deckNameVisible ? (
            <FormTextInput value={deckName} onChangeText={setDeckName} placeholder="Custom deck name" />
          ) : null}
        </Field>
      </Section>

      <Section>
        <Field label="Placement">
          <View style={styles.placementRow}>
            <FormTextInput
              style={styles.placementInput}
              value={placement}
              onChangeText={setPlacement}
              placeholder="Final standing"
              keyboardType="number-pad"
            />
            <Text style={styles.placementOutOf}>/</Text>
            <FormTextInput
              style={styles.placementInput}
              value={placementTotal}
              onChangeText={setPlacementTotal}
              placeholder="Players"
              keyboardType="number-pad"
            />
            {isFirstPlace ? (
              <Text style={styles.firstPlaceBadge}>🏆 1st</Text>
            ) : (
              <Pressable
                onPress={() => setPrized((value) => !value)}
                style={[
                  styles.prizeToggle,
                  { borderColor: palette.border },
                  prized && { backgroundColor: palette.accent, borderColor: palette.accent },
                ]}>
                <Text
                  style={[
                    styles.prizeToggleText,
                    prized && [styles.prizeToggleTextOn, { color: palette.onAccentText }],
                  ]}>
                  🎖️ Prize
                </Text>
              </Pressable>
            )}
          </View>
        </Field>
      </Section>

      <Section>
        <Field label="Rounds">
          <RoundsEditor ref={roundsEditorRef} rounds={rounds} onChange={setRounds} />
        </Field>
      </Section>

      <Section>
        <Field label="Notes">
          <FormTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else worth remembering (optional)"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
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

      {onAddMarker ? (
        <Pressable style={styles.addMarkerLink} onPress={onAddMarker}>
          <Text style={styles.addMarkerLinkText}>+ Add a marker instead</Text>
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
  placementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  placementInput: {
    flex: 1,
  },
  placementOutOf: {
    fontSize: 14,
    opacity: MUTED_TEXT_OPACITY,
  },
  firstPlaceBadge: {
    minWidth: PRIZE_PILL_MIN_WIDTH,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PRIZE_ICON_COLOR.first,
    backgroundColor: PRIZE_ICON_COLOR.first,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
  },
  prizeToggle: {
    minWidth: PRIZE_PILL_MIN_WIDTH,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  prizeToggleText: {
    fontSize: 14,
  },
  prizeToggleTextOn: {
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
  },
  dateButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
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
  addMarkerLink: {
    alignSelf: 'center',
    marginTop: 4,
    padding: 8,
  },
  addMarkerLinkText: {
    fontSize: 13,
    opacity: MUTED_TEXT_OPACITY,
  },
});
