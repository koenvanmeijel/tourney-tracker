import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export type BackupFormat = 'json' | 'zip' | 'txt';

interface SaveBackupModalProps {
  visible: boolean;
  onSelect: (format: BackupFormat) => void;
  onCancel: () => void;
}

export function SaveBackupModal({ visible, onSelect, onCancel }: SaveBackupModalProps) {
  const { palette } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: palette.onSurfaceText }]}>Save backup</Text>

          <Pressable
            style={[styles.option, { borderColor: palette.border }]}
            onPress={() => onSelect('json')}>
            <Text style={[styles.optionTitle, { color: palette.onSurfaceText }]}>Events only (.JSON)</Text>
            <Text style={[styles.optionSubtitle, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
              A small file with your events and markers. (No photos.)
            </Text>
          </Pressable>

          <Pressable
            style={[styles.option, { borderColor: palette.border }]}
            onPress={() => onSelect('zip')}>
            <Text style={[styles.optionTitle, { color: palette.onSurfaceText }]}>Events and photos (.ZIP)</Text>
            <Text style={[styles.optionSubtitle, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
              Includes every photo and decklist, renamed/linked for re-import.
            </Text>
          </Pressable>

          <Pressable
            style={[styles.option, { borderColor: palette.border }]}
            onPress={() => onSelect('txt')}>
            <Text style={[styles.optionTitle, { color: palette.onSurfaceText }]}>Readable log (.TXT)</Text>
            <Text style={[styles.optionSubtitle, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
              A plain-text log of your events and markers, for reading, not for restoring.
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={[styles.cancelButtonText, { color: palette.accent }]}>Cancel</Text>
          </Pressable>
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
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  option: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
