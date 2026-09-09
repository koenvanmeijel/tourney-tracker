import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Text, View } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useAppAlert } from '@/context/AppAlertContext';
import { useEvents } from '@/context/EventsContext';
import { useMarkers } from '@/context/MarkersContext';
import { useTheme } from '@/context/ThemeContext';
import { buildExportPayload, parseImportPayload } from '@/utils/backup';
import { toIsoDateString } from '@/utils/date';

function backupFilename(): string {
  return `tourney-tracker-backup-${toIsoDateString(new Date())}.json`;
}

function isPickerCancellation(err: unknown): boolean {
  return err instanceof Error && err.message.includes('cancelled by the user');
}

type ImportMode = 'replace' | 'add';

export default function DataManagementScreen() {
  const { palette } = useTheme();
  const { events, restoreAll: restoreAllEvents, addAll: addAllEvents } = useEvents();
  const { markers, restoreAll: restoreAllMarkers, addAll: addAllMarkers } = useMarkers();
  const { alert, confirm } = useAppAlert();
  const [sharing, setSharing] = useState(false);
  const [savingToFolder, setSavingToFolder] = useState(false);
  const [importingMode, setImportingMode] = useState<ImportMode | null>(null);

  async function handleShare() {
    setSharing(true);
    try {
      const payload = buildExportPayload(events, markers);
      const json = JSON.stringify(payload, null, 2);
      const file = new File(Paths.cache, backupFilename());
      file.create({ overwrite: true });
      file.write(json);

      if (!(await Sharing.isAvailableAsync())) {
        await alert('Sharing unavailable', "Your device doesn't support the share sheet.");
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Tourney Tracker backup',
      });
    } catch (err) {
      await alert('Error', err instanceof Error ? err.message : 'Failed to export backup.');
    } finally {
      setSharing(false);
    }
  }

  async function handleSaveToFolder() {
    setSavingToFolder(true);
    try {
      const directory = await Directory.pickDirectoryAsync();
      const payload = buildExportPayload(events, markers);
      const json = JSON.stringify(payload, null, 2);
      const filename = backupFilename();
      const file = directory.createFile(filename, 'application/json');
      file.write(json);
      await alert('Saved', `Saved as "${filename}".`);
    } catch (err) {
      if (!isPickerCancellation(err)) {
        await alert('Error', err instanceof Error ? err.message : 'Failed to save backup.');
      }
    } finally {
      setSavingToFolder(false);
    }
  }

  async function handleImport(mode: ImportMode) {
    setImportingMode(mode);
    try {
      const pick = await File.pickFileAsync();
      if (pick.canceled) {
        return;
      }

      const text = await pick.result.text();
      const imported = parseImportPayload(text);
      const importedCount = `${imported.events.length} event(s) and ${imported.markers.length} marker(s)`;
      const existingCount = `${events.length} event(s) and ${markers.length} marker(s)`;

      const confirmTitle = mode === 'replace' ? 'Replace everything?' : 'Add this backup?';
      const confirmMessage =
        mode === 'replace'
          ? `This will replace your ${existingCount} with ${importedCount} from this backup. This can't be undone.`
          : `This will add ${importedCount} from this backup to your ${existingCount}.`;

      const confirmed = await confirm(confirmTitle, confirmMessage, {
        confirmLabel: mode === 'replace' ? 'Replace' : 'Add',
        destructive: mode === 'replace',
      });
      if (!confirmed) {
        return;
      }

      try {
        if (mode === 'replace') {
          await restoreAllEvents(imported.events);
          await restoreAllMarkers(imported.markers);
        } else {
          await addAllEvents(imported.events);
          await addAllMarkers(imported.markers);
        }
        await alert(mode === 'replace' ? 'Restored' : 'Added', `Imported ${importedCount}.`);
      } catch (err) {
        await alert('Error', err instanceof Error ? err.message : 'Failed to import backup.');
      }
    } catch (err) {
      await alert('Invalid backup file', err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setImportingMode(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Data Management' }} />
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup</Text>
          <Text style={styles.sectionSubtitle}>Photo attachments aren&apos;t included in this file.</Text>
          <Pressable
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={handleSaveToFolder}
            disabled={savingToFolder}>
            <Text style={[styles.buttonText, { color: palette.onAccentText }]}>
              {savingToFolder ? 'Saving…' : 'Save to a folder'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: palette.secondaryFill }]}
            onPress={handleShare}
            disabled={sharing}>
            <Text style={styles.secondaryButtonText}>{sharing ? 'Sharing…' : 'Share (email, etc.)'}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore</Text>
          <Pressable
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={() => handleImport('add')}
            disabled={importingMode !== null}>
            <Text style={[styles.buttonText, { color: palette.onAccentText }]}>
              {importingMode === 'add' ? 'Adding…' : 'Import & Add'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: palette.dangerTint }]}
            onPress={() => handleImport('replace')}
            disabled={importingMode !== null}>
            <Text style={[styles.dangerButtonText, { color: palette.danger }]}>
              {importingMode === 'replace' ? 'Replacing…' : 'Import & Replace'}
            </Text>
          </Pressable>
        </View>
      </View>
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
  secondaryButtonText: {
    fontWeight: '700',
  },
  dangerButtonText: {
    fontWeight: '700',
  },
});
