import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { EVENT_TYPE_LABELS } from '@/models/types';
import type { UnmatchedPhoto } from '@/utils/backup';
import { formatIsoDateForDisplay } from '@/utils/date';
import type { DuplicateEventMatch } from '@/utils/importDedupe';

export type ImportAction = 'add' | 'replace';

interface ImportReviewModalProps {
  visible: boolean;
  existingEventsCount: number;
  existingMarkersCount: number;
  importedEventsCount: number;
  importedMarkersCount: number;
  duplicates: DuplicateEventMatch[];
  /** importedIndex -> true (add anyway) / false or absent (skip, the default). */
  decisions: Record<number, boolean>;
  onToggle: (importedIndex: number) => void;
  totalPhotoCount: number;
  matchedPhotoCount: number;
  unmatchedPhotos: UnmatchedPhoto[];
  eventsToInsertCount: number;
  onCancel: () => void;
  onImportAdd: () => void;
  onImportReplace: () => void;
  confirming: ImportAction | null;
}

function unmatchedReasonLabel(reason: UnmatchedPhoto['reason']): string {
  return reason === 'ambiguous-multiple-events' ? 'matches more than one event' : 'no matching event';
}

export function ImportReviewModal({
  visible,
  existingEventsCount,
  existingMarkersCount,
  importedEventsCount,
  importedMarkersCount,
  duplicates,
  decisions,
  onToggle,
  totalPhotoCount,
  matchedPhotoCount,
  unmatchedPhotos,
  eventsToInsertCount,
  onCancel,
  onImportAdd,
  onImportReplace,
  confirming,
}: ImportReviewModalProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const disabled = confirming !== null;

  const addLabel = confirming === 'add' ? 'Adding…' : `Import & Add (${eventsToInsertCount})`;
  const replaceLabel = confirming === 'replace' ? 'Replacing…' : `Import & Replace (${importedEventsCount})`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View
        style={[
          styles.container,
          { backgroundColor: palette.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}>
        <Text style={[styles.title, { color: palette.text }]}>Review import</Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.summaryRow, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryValue, { color: palette.onSurfaceText }]}>{existingEventsCount}</Text>
              <Text style={[styles.summaryLabel, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                existing event{existingEventsCount === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.summarySubLabel, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                {existingMarkersCount} marker{existingMarkersCount === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.borderSubtle }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryValue, { color: palette.onSurfaceText }]}>{importedEventsCount}</Text>
              <Text style={[styles.summaryLabel, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                importable event{importedEventsCount === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.summarySubLabel, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                {importedMarkersCount} marker{importedMarkersCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {duplicates.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Possible duplicates ({duplicates.length})
              </Text>
              <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
                These match an event already in your log by date, event type and location. Skipped by default when
                adding — ignored when replacing.
              </Text>
              {duplicates.map((duplicate) => {
                const adding = decisions[duplicate.importedIndex] === true;
                const { imported } = duplicate;
                return (
                  <View
                    key={duplicate.importedIndex}
                    style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { color: palette.onSurfaceText }]}>
                        {formatIsoDateForDisplay(imported.date)} · {EVENT_TYPE_LABELS[imported.eventType]}
                      </Text>
                      <Text
                        style={[styles.rowSubtitle, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                        {imported.location ? imported.location : 'No location'} · matches{' '}
                        {duplicate.existingMatches.length} existing event
                        {duplicate.existingMatches.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={styles.toggleRow}>
                      <Pressable
                        onPress={() => adding && onToggle(duplicate.importedIndex)}
                        style={[
                          styles.toggleChip,
                          { borderColor: palette.border },
                          !adding && { backgroundColor: palette.secondaryFill },
                        ]}>
                        <Text
                          style={[
                            styles.toggleChipText,
                            { color: palette.onSurfaceText },
                            !adding && styles.toggleChipTextSelected,
                          ]}>
                          Skip
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => !adding && onToggle(duplicate.importedIndex)}
                        style={[
                          styles.toggleChip,
                          { borderColor: palette.accent },
                          adding && { backgroundColor: palette.accent },
                        ]}>
                        <Text
                          style={[
                            styles.toggleChipText,
                            { color: adding ? palette.onAccentText : palette.accent },
                            adding && styles.toggleChipTextSelected,
                          ]}>
                          Add anyway
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {totalPhotoCount > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Photos</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
                {matchedPhotoCount} of {totalPhotoCount} photo{totalPhotoCount === 1 ? '' : 's'} will be attached if
                adding.
              </Text>
              {unmatchedPhotos.length > 0 ? (
                <View style={[styles.unmatchedBox, { backgroundColor: palette.dangerTint }]}>
                  {unmatchedPhotos.map((unmatched) => (
                    <Text key={unmatched.entry.filename} style={[styles.unmatchedText, { color: palette.danger }]}>
                      {unmatched.entry.filename} — {unmatchedReasonLabel(unmatched.reason)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.cancelButton} onPress={onCancel} disabled={disabled}>
            <Text style={[styles.cancelButtonText, { color: palette.accent }]}>Cancel</Text>
          </Pressable>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.button, { backgroundColor: palette.accent }]}
              onPress={onImportAdd}
              disabled={disabled}>
              <Text style={[styles.buttonText, { color: palette.onAccentText }]}>{addLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: palette.dangerTint }]}
              onPress={onImportReplace}
              disabled={disabled}>
              <Text style={[styles.buttonText, { color: palette.danger }]}>{replaceLabel}</Text>
            </Pressable>
          </View>
          <Text style={[styles.footerHint, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
            Replacing erases your {existingEventsCount} existing event{existingEventsCount === 1 ? '' : 's'} and
            can't be undone.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 24,
    paddingBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  summarySubLabel: {
    fontSize: 11.5,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  toggleChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  toggleChipTextSelected: {
    fontWeight: '700',
  },
  unmatchedBox: {
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  unmatchedText: {
    fontSize: 12,
  },
  footer: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
  },
  buttonText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  footerHint: {
    fontSize: 11.5,
    textAlign: 'center',
  },
});
