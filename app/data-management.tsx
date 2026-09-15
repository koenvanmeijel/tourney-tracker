import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Directory, File } from 'expo-file-system';

import { ImportReviewModal, type ImportAction } from '@/components/ImportReviewModal';
import { SaveBackupModal, type BackupFormat } from '@/components/SaveBackupModal';
import { Text, View } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useAppAlert } from '@/context/AppAlertContext';
import { useEvents } from '@/context/EventsContext';
import { useMarkers } from '@/context/MarkersContext';
import { useTheme } from '@/context/ThemeContext';
import { addEventPhoto } from '@/db/eventPhotos';
import type { NewEventWithTimestamps } from '@/db/events';
import type { NewMarkerWithTimestamps } from '@/db/markers';
import type { EventRecord } from '@/models/types';
import {
  buildBackupZip,
  buildExportPayload,
  matchPhotoEntries,
  parseBackupZip,
  parseImportPayload,
  type PhotoExportCollision,
  type PhotoMatch,
  type PhotoMatchResult,
  type PhotoMatchTarget,
  type ZipPhotoEntry,
} from '@/utils/backup';
import { toIsoDateString } from '@/utils/date';
import { savePhotoBytes } from '@/utils/eventPhotoStorage';
import { findDuplicateEvents, type DuplicateEventMatch } from '@/utils/importDedupe';
import { eventPhotoZipKey, photoZipKeyId } from '@/utils/photoZip';

function backupFilename(extension: 'json' | 'zip'): string {
  return `tourney-tracker-backup-${toIsoDateString(new Date())}.${extension}`;
}

function isPickerCancellation(err: unknown): boolean {
  return err instanceof Error && err.message.includes('cancelled by the user');
}

function collisionsMessage(collisions: PhotoExportCollision[]): string {
  const count = collisions.reduce((sum, collision) => sum + collision.events.length, 0);
  return `${count} event(s) share the same date, event type and location as another event, so their photos couldn't be uniquely named for this export and were left out. Give one a distinct location to include its photos next time.`;
}

interface ParsedImportFile {
  events: NewEventWithTimestamps[];
  markers: NewMarkerWithTimestamps[];
  photoEntries: ZipPhotoEntry[];
  hasPayload: boolean;
}

async function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (file.name.toLowerCase().endsWith('.zip')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const zip = await parseBackupZip(bytes);
    return {
      events: zip.payload?.events ?? [],
      markers: zip.payload?.markers ?? [],
      photoEntries: zip.photoEntries,
      hasPayload: zip.payload != null,
    };
  }

  const payload = parseImportPayload(await file.text());
  return { events: payload.events, markers: payload.markers, photoEntries: [], hasPayload: true };
}

async function attachMatchedPhotos(matched: PhotoMatch[], idByImportedIndex: Map<number, number>): Promise<number> {
  const byEventId = new Map<number, PhotoMatch[]>();
  for (const match of matched) {
    const eventId = match.target.kind === 'imported' ? idByImportedIndex.get(match.target.importedIndex) : match.target.eventId;
    if (eventId == null) continue;
    const bucket = byEventId.get(eventId);
    if (bucket) {
      bucket.push(match);
    } else {
      byEventId.set(eventId, [match]);
    }
  }

  for (const [eventId, group] of byEventId) {
    group.sort((a, b) => a.entry.index - b.entry.index);
    for (const match of group) {
      const filename = savePhotoBytes(match.entry.data, match.entry.extension);
      await addEventPhoto(eventId, filename);
    }
  }
  return byEventId.size;
}

interface ReviewState {
  importedEvents: NewEventWithTimestamps[];
  importedMarkers: NewMarkerWithTimestamps[];
  duplicates: DuplicateEventMatch[];
  /** importedIndex -> true (add anyway). Absent/false means skip. */
  decisions: Record<number, boolean>;
  photoEntries: ZipPhotoEntry[];
}

function buildPhotoCandidates(
  review: ReviewState,
  existingEvents: EventRecord[],
  willInsert: (importedIndex: number) => boolean
): { key: string; target: PhotoMatchTarget }[] {
  const candidates: { key: string; target: PhotoMatchTarget }[] = [];
  for (const event of existingEvents) {
    candidates.push({
      key: photoZipKeyId(eventPhotoZipKey(event.date, event.eventType, event.location)),
      target: { kind: 'existing', eventId: event.id },
    });
  }
  review.importedEvents.forEach((event, importedIndex) => {
    if (willInsert(importedIndex)) {
      candidates.push({
        key: photoZipKeyId(eventPhotoZipKey(event.date, event.eventType, event.location ?? null)),
        target: { kind: 'imported', importedIndex },
      });
    }
  });
  return candidates;
}

export default function DataManagementScreen() {
  const { palette } = useTheme();
  const { events, refresh: refreshEvents, restoreAll: restoreAllEvents, addAll: addAllEvents } = useEvents();
  const { markers, restoreAll: restoreAllMarkers, addAll: addAllMarkers } = useMarkers();
  const { alert, confirm } = useAppAlert();
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [savingToFolder, setSavingToFolder] = useState(false);
  const [pickingFile, setPickingFile] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<ImportAction | null>(null);

  const duplicateIndexSet = useMemo(
    () => new Set(review?.duplicates.map((duplicate) => duplicate.importedIndex) ?? []),
    [review]
  );

  const willInsert = useCallback(
    (importedIndex: number) => !duplicateIndexSet.has(importedIndex) || review?.decisions[importedIndex] === true,
    [duplicateIndexSet, review]
  );

  const photoMatch: PhotoMatchResult = useMemo(() => {
    if (!review) {
      return { matched: [], unmatched: [] };
    }
    const candidates = buildPhotoCandidates(review, events, willInsert);
    return matchPhotoEntries(review.photoEntries, candidates);
  }, [review, events, willInsert]);

  const eventsToInsertCount = useMemo(() => {
    if (!review) return 0;
    return review.importedEvents.reduce((count, _event, index) => count + (willInsert(index) ? 1 : 0), 0);
  }, [review, willInsert]);

  async function buildBackupFile(format: BackupFormat): Promise<{
    content: string | Uint8Array;
    filename: string;
    mimeType: string;
    collisions: PhotoExportCollision[];
  }> {
    if (format === 'json') {
      const payload = buildExportPayload(events, markers);
      return {
        content: JSON.stringify(payload, null, 2),
        filename: backupFilename('json'),
        mimeType: 'application/json',
        collisions: [],
      };
    }
    const { zip, collisions } = await buildBackupZip(events, markers);
    return { content: zip, filename: backupFilename('zip'), mimeType: 'application/zip', collisions };
  }

  async function handleSaveFormat(format: BackupFormat) {
    setShowSaveOptions(false);
    setSavingToFolder(true);
    try {
      const directory = await Directory.pickDirectoryAsync();
      const built = await buildBackupFile(format);
      const file = directory.createFile(built.filename, built.mimeType);
      file.write(built.content);
      let message = `Saved as "${built.filename}".`;
      if (built.collisions.length > 0) {
        message += ` ${collisionsMessage(built.collisions)}`;
      }
      await alert('Saved', message);
    } catch (err) {
      if (!isPickerCancellation(err)) {
        await alert('Error', err instanceof Error ? err.message : 'Failed to save backup.');
      }
    } finally {
      setSavingToFolder(false);
    }
  }

  async function handlePickImportFile() {
    setPickingFile(true);
    try {
      const pick = await File.pickFileAsync();
      if (pick.canceled) {
        return;
      }

      const parsed = await parseImportFile(pick.result);
      if (!parsed.hasPayload) {
        await alert('Nothing to import', "That file doesn't look like a Tourney Tracker backup.");
        return;
      }

      const duplicates = findDuplicateEvents(parsed.events, events);
      setReview({
        importedEvents: parsed.events,
        importedMarkers: parsed.markers,
        duplicates,
        decisions: {},
        photoEntries: parsed.photoEntries,
      });
    } catch (err) {
      await alert('Invalid backup file', err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setPickingFile(false);
    }
  }

  function toggleDuplicateDecision(importedIndex: number) {
    setReview((current) => {
      if (!current) return current;
      const adding = current.decisions[importedIndex] === true;
      const decisions = { ...current.decisions };
      if (adding) {
        delete decisions[importedIndex];
      } else {
        decisions[importedIndex] = true;
      }
      return { ...current, decisions };
    });
  }

  async function handleImportAdd() {
    if (!review) return;
    setConfirmingAction('add');
    try {
      const eventsToInsert: NewEventWithTimestamps[] = [];
      const originalIndexes: number[] = [];
      review.importedEvents.forEach((event, index) => {
        if (willInsert(index)) {
          eventsToInsert.push(event);
          originalIndexes.push(index);
        }
      });

      const insertedIds = await addAllEvents(eventsToInsert);
      await addAllMarkers(review.importedMarkers);

      const idByImportedIndex = new Map(
        originalIndexes.map((originalIndex, position): [number, number] => [originalIndex, insertedIds[position]])
      );
      const { matched, unmatched } = photoMatch;
      const attachedEventCount = await attachMatchedPhotos(matched, idByImportedIndex);
      if (attachedEventCount > 0) {
        await refreshEvents();
      }

      const skippedDuplicates = review.duplicates.length - review.duplicates.filter((d) => willInsert(d.importedIndex)).length;
      const parts = [`${eventsToInsert.length} event(s)`, `${review.importedMarkers.length} marker(s)`];
      if (review.photoEntries.length > 0) {
        parts.push(`${matched.length} photo(s)`);
      }
      let message = `Imported ${parts.join(', ')}.`;
      if (skippedDuplicates > 0) {
        message += ` Skipped ${skippedDuplicates} duplicate event(s).`;
      }
      if (unmatched.length > 0) {
        message += ` ${unmatched.length} photo(s) couldn't be matched to an event and were left out.`;
      }

      setReview(null);
      await alert('Added', message);
    } catch (err) {
      await alert('Error', err instanceof Error ? err.message : 'Failed to import backup.');
    } finally {
      setConfirmingAction(null);
    }
  }

  async function handleImportReplace() {
    if (!review) return;
    const existingCount = `${events.length} event(s) and ${markers.length} marker(s)`;
    const importedCount = `${review.importedEvents.length} event(s) and ${review.importedMarkers.length} marker(s)`;
    const confirmed = await confirm(
      'Replace everything?',
      `This will replace your ${existingCount} with ${importedCount} from this backup. This can't be undone.`,
      { confirmLabel: 'Replace', destructive: true }
    );
    if (!confirmed) {
      return;
    }

    setConfirmingAction('replace');
    try {
      const insertedIds = await restoreAllEvents(review.importedEvents);
      await restoreAllMarkers(review.importedMarkers);

      let message = `Imported ${importedCount}.`;
      if (review.photoEntries.length > 0) {
        const candidates = review.importedEvents.map((event, importedIndex) => ({
          key: photoZipKeyId(eventPhotoZipKey(event.date, event.eventType, event.location ?? null)),
          target: { kind: 'imported' as const, importedIndex },
        }));
        const { matched, unmatched } = matchPhotoEntries(review.photoEntries, candidates);
        const idByImportedIndex = new Map(insertedIds.map((id, index): [number, number] => [index, id]));
        const attachedEventCount = await attachMatchedPhotos(matched, idByImportedIndex);
        if (attachedEventCount > 0) {
          await refreshEvents();
        }
        message += ` ${matched.length} photo(s) attached.`;
        if (unmatched.length > 0) {
          message += ` ${unmatched.length} photo(s) couldn't be matched to an event and were left out.`;
        }
      }

      setReview(null);
      await alert('Restored', message);
    } catch (err) {
      await alert('Error', err instanceof Error ? err.message : 'Failed to import backup.');
    } finally {
      setConfirmingAction(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Data Management' }} />
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup</Text>
          <Pressable
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={() => setShowSaveOptions(true)}
            disabled={savingToFolder}>
            <Text style={[styles.buttonText, { color: palette.onAccentText }]}>
              {savingToFolder ? 'Saving…' : 'Save backup'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore</Text>
          <Text style={styles.sectionSubtitle}>Accepted file types: .JSON and .ZIP</Text>
          <Pressable
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={handlePickImportFile}
            disabled={pickingFile}>
            <Text style={[styles.buttonText, { color: palette.onAccentText }]}>
              {pickingFile ? 'Reading…' : 'Import backup'}
            </Text>
          </Pressable>
        </View>
      </View>

      <SaveBackupModal
        visible={showSaveOptions}
        onSelect={handleSaveFormat}
        onCancel={() => setShowSaveOptions(false)}
      />

      <ImportReviewModal
        visible={review != null}
        existingEventsCount={events.length}
        existingMarkersCount={markers.length}
        importedEventsCount={review?.importedEvents.length ?? 0}
        importedMarkersCount={review?.importedMarkers.length ?? 0}
        duplicates={review?.duplicates ?? []}
        decisions={review?.decisions ?? {}}
        onToggle={toggleDuplicateDecision}
        totalPhotoCount={review?.photoEntries.length ?? 0}
        matchedPhotoCount={photoMatch.matched.length}
        unmatchedPhotos={photoMatch.unmatched}
        eventsToInsertCount={eventsToInsertCount}
        onCancel={() => setReview(null)}
        onImportAdd={handleImportAdd}
        onImportReplace={handleImportReplace}
        confirming={confirmingAction}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 32,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    opacity: MUTED_TEXT_OPACITY,
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '700',
  },
});
