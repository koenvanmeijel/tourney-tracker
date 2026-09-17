import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormTextInput } from '@/components/form/FormTextInput';
import { useTheme } from '@/context/ThemeContext';

interface DuplicateDecklistModalProps {
  visible: boolean;
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function DuplicateDecklistModal({ visible, initialName, onConfirm, onCancel }: DuplicateDecklistModalProps) {
  const { palette } = useTheme();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setName(initialName);
    }
  }, [visible, initialName]);

  function handleConfirm() {
    if (name.trim()) {
      onConfirm(name.trim());
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: palette.onSurfaceText }]}>Duplicate decklist</Text>
          <FormTextInput
            value={name}
            onChangeText={setName}
            placeholder="Deck name"
            autoFocus
            selectTextOnFocus
            onSubmitEditing={handleConfirm}
            returnKeyType="done"
          />
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, { backgroundColor: palette.secondaryFill }]} onPress={onCancel}>
              <Text style={[styles.cancelButtonText, { color: palette.onSurfaceText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: palette.accent }]}
              onPress={handleConfirm}
              disabled={!name.trim()}>
              <Text style={[styles.confirmButtonText, { color: palette.onAccentText }]}>Duplicate</Text>
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
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
