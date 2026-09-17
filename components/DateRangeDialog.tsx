import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';

import { MaskedDateInput } from '@/components/form/MaskedDateInput';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useMarkers } from '@/context/MarkersContext';
import { useTheme } from '@/context/ThemeContext';
import type { MarkerRecord } from '@/models/types';
import {
  dateToDigits,
  formatDateInput,
  formatIsoDateForDisplay,
  parseDateDigits,
  parseIsoDateString,
  toIsoDateString,
} from '@/utils/date';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangeDialogProps {
  visible: boolean;
  from: string;
  to: string;
  hasActiveRange: boolean;
  onApply: (from: string, to: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function DateField({
  label,
  display,
  digits,
  resetToken,
  markers,
  onPicked,
  onTyped,
}: {
  label: string;
  display: string;
  digits: string;
  resetToken: number;
  markers: MarkerRecord[];
  onPicked: (selected: Date) => void;
  onTyped: (masked: string, digits: string) => void;
}) {
  const { palette } = useTheme();
  const [markerMenuOpen, setMarkerMenuOpen] = useState(false);

  function openPicker() {
    DateTimePickerAndroid.open({
      value: parseDateDigits(digits) ?? new Date(),
      mode: 'date',
      onValueChange: (_event, selectedDate) => onPicked(selectedDate),
    });
  }

  function pickMarker(marker: MarkerRecord) {
    const date = parseIsoDateString(marker.date);
    if (date) {
      onPicked(date);
    }
    setMarkerMenuOpen(false);
  }

  return (
    <View style={styles.dateRow}>
      <Text style={[styles.dateRowLabel, { color: palette.onSurfaceText }]}>{label}</Text>
      <View style={styles.dateInputGroup}>
        <MaskedDateInput
          key={resetToken}
          style={styles.dateInput}
          defaultValue={display}
          onChangeText={onTyped}
        />
        <Pressable
          style={[styles.dateIconButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={openPicker}>
          <SymbolView name={{ android: 'calendar_today' }} tintColor={palette.accent} size={18} />
        </Pressable>
        <View style={styles.markerMenuAnchor}>
          <Pressable
            style={[
              styles.dateIconButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
              markerMenuOpen && { backgroundColor: palette.accent, borderColor: palette.accent },
            ]}
            onPress={() => setMarkerMenuOpen((open) => !open)}>
            <SymbolView
              name={{ android: 'flag' }}
              tintColor={markerMenuOpen ? palette.onAccentText : palette.accent}
              size={18}
            />
          </Pressable>
          {markerMenuOpen ? (
            <View
              style={[
                styles.markerMenu,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              {markers.length === 0 ? (
                <Text
                  style={[styles.markerMenuEmpty, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                  No markers yet
                </Text>
              ) : (
                <ScrollView style={styles.markerMenuScroll} keyboardShouldPersistTaps="handled">
                  {markers.map((marker) => (
                    <Pressable
                      key={marker.id}
                      style={styles.markerMenuRow}
                      onPress={() => pickMarker(marker)}>
                      <Text
                        style={[styles.markerMenuTitle, { color: palette.onSurfaceText }]}
                        numberOfLines={1}>
                        {marker.title}
                      </Text>
                      <Text
                        style={[
                          styles.markerMenuDate,
                          { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY },
                        ]}>
                        {formatIsoDateForDisplay(marker.date)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function DateRangeDialog({ visible, from, to, hasActiveRange, onApply, onClear, onClose }: DateRangeDialogProps) {
  const { palette } = useTheme();
  const { markers } = useMarkers();
  const [fromDisplay, setFromDisplay] = useState('');
  const [fromDigits, setFromDigits] = useState('');
  const [fromResetToken, setFromResetToken] = useState(0);
  const [toDisplay, setToDisplay] = useState('');
  const [toDigits, setToDigits] = useState('');
  const [toResetToken, setToResetToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sortedMarkers = useMemo(
    () => [...markers].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [markers]
  );

  useEffect(() => {
    if (visible) {
      const fromDate = parseIsoDateString(from) ?? new Date();
      const toDate = parseIsoDateString(to) ?? new Date();
      setFromDisplay(formatDateInput(fromDate));
      setFromDigits(dateToDigits(fromDate));
      setToDisplay(formatDateInput(toDate));
      setToDigits(dateToDigits(toDate));
      setFromResetToken((token) => token + 1);
      setToResetToken((token) => token + 1);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function applyFrom(selected: Date) {
    setFromDisplay(formatDateInput(selected));
    setFromDigits(dateToDigits(selected));
    setFromResetToken((token) => token + 1);
  }

  function applyTo(selected: Date) {
    setToDisplay(formatDateInput(selected));
    setToDigits(dateToDigits(selected));
    setToResetToken((token) => token + 1);
  }

  function handleApply() {
    const fromDate = parseDateDigits(fromDigits);
    const toDate = parseDateDigits(toDigits);
    if (!fromDate || !toDate) {
      setError('Enter two complete, valid dates.');
      return;
    }
    const fromIso = toIsoDateString(fromDate);
    const toIso = toIsoDateString(toDate);
    if (fromIso > toIso) {
      setError('"From" must be on or before "To".');
      return;
    }
    onApply(fromIso, toIso);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: palette.onSurfaceText }]}>Date range</Text>
            {hasActiveRange ? (
              <Pressable onPress={onClear}>
                <Text style={[styles.clearLink, { color: palette.accent }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          <DateField
            label="From"
            display={fromDisplay}
            digits={fromDigits}
            resetToken={fromResetToken}
            markers={sortedMarkers}
            onPicked={applyFrom}
            onTyped={(masked, digits) => {
              setFromDisplay(masked);
              setFromDigits(digits);
            }}
          />
          <DateField
            label="To"
            display={toDisplay}
            digits={toDigits}
            resetToken={toResetToken}
            markers={sortedMarkers}
            onPicked={applyTo}
            onTyped={(masked, digits) => {
              setToDisplay(masked);
              setToDigits(digits);
            }}
          />

          {error ? <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text> : null}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, { backgroundColor: palette.secondaryFill }]} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: palette.onSurfaceText }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={handleApply}>
              <Text style={[styles.confirmButtonText, { color: palette.onAccentText }]}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  clearLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateRowLabel: {
    minWidth: 36,
    fontSize: 14,
    fontWeight: '600',
    opacity: MUTED_TEXT_OPACITY,
  },
  dateInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  dateIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  markerMenuAnchor: {
    position: 'relative',
  },
  markerMenu: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 220,
    maxHeight: 220,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    zIndex: 20,
    elevation: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  markerMenuScroll: {
    maxHeight: 208,
  },
  markerMenuEmpty: {
    fontSize: 13,
    padding: 8,
  },
  markerMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  markerMenuTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  markerMenuDate: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 13.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
  },
  confirmButtonText: {
    fontWeight: '700',
  },
});
