import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ColorSwatchPicker } from '@/components/ColorSwatchPicker';
import { Field, Section } from '@/components/form/FormSection';
import { FormTextInput } from '@/components/form/FormTextInput';
import { MaskedDateInput } from '@/components/form/MaskedDateInput';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import type { NewMarker } from '@/models/types';
import {
  dateToDigits,
  formatDateInput,
  parseDateDigits,
  parseIsoDateString,
  toIsoDateString,
} from '@/utils/date';
import { DEFAULT_MARKER_COLOR } from '@/utils/markerColors';

interface MarkerFormProps {
  initialValue?: NewMarker;
  submitLabel: string;
  onSubmit: (marker: NewMarker) => Promise<void>;
  onDelete?: () => void;
}

export function MarkerForm({ initialValue, submitLabel, onSubmit, onDelete }: MarkerFormProps) {
  const { palette } = useTheme();
  const initialDate = initialValue?.date ? parseIsoDateString(initialValue.date) ?? new Date() : new Date();
  const [date, setDate] = useState(formatDateInput(initialDate));
  const [dateDigits, setDateDigits] = useState(dateToDigits(initialDate));
  const [dateResetToken, setDateResetToken] = useState(0);
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [note, setNote] = useState(initialValue?.note ?? '');
  const [color, setColor] = useState(initialValue?.color ?? DEFAULT_MARKER_COLOR);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      await onSubmit({
        date: toIsoDateString(parsedDate),
        title: title.trim(),
        note: note.trim() || null,
        color,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save marker');
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

        <Field label="Title">
          <FormTextInput value={title} onChangeText={setTitle} placeholder="e.g. New season started" />
        </Field>

        <Field label="Note">
          <FormTextInput
            value={note}
            onChangeText={setNote}
            placeholder="Anything else worth remembering (optional)"
            multiline
            numberOfLines={3}
            style={styles.noteInput}
          />
        </Field>

        <Field label="Color">
          <ColorSwatchPicker value={color} onChange={setColor} />
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
          <Text style={[styles.deleteButtonText, { color: palette.danger }]}>Delete marker</Text>
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
  noteInput: {
    minHeight: 70,
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
