import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import type { DecklistRecord } from '@/models/types';
import { sortDecklistsForLinking } from '@/utils/decklistLink';

interface DecklistLinkPickerProps {
  visible: boolean;
  decklists: DecklistRecord[];
  deckPokemon: string[];
  selectedId: number | null;
  onSelect: (decklist: DecklistRecord) => void;
  onUnlink: () => void;
  onCancel: () => void;
}

export function DecklistLinkPicker({
  visible,
  decklists,
  deckPokemon,
  selectedId,
  onSelect,
  onUnlink,
  onCancel,
}: DecklistLinkPickerProps) {
  const { palette } = useTheme();
  const { sorted, matchingCount } = sortDecklistsForLinking(decklists, deckPokemon);
  const showDivider = matchingCount > 0 && matchingCount < sorted.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: palette.onSurfaceText }]}>Link a decklist</Text>

          {sorted.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
              No decklists yet — add one from the More tab first.
            </Text>
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              renderItem={({ item, index }) => {
                const selected = item.id === selectedId;
                return (
                  <>
                    {showDivider && index === matchingCount ? (
                      <View style={[styles.divider, { backgroundColor: palette.borderSubtle }]} />
                    ) : null}
                    <Pressable
                      style={[styles.row, selected && { backgroundColor: palette.accentTint }]}
                      onPress={() => onSelect(item)}>
                      <Text style={[styles.rowName, { color: palette.onSurfaceText }]} numberOfLines={1}>
                        {item.deckName}
                      </Text>
                      {item.pokemonNames.length > 0 ? (
                        <Text
                          style={[styles.rowSubtitle, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}
                          numberOfLines={1}>
                          {item.pokemonNames.join('/')}
                        </Text>
                      ) : null}
                    </Pressable>
                  </>
                );
              }}
            />
          )}

          <View style={styles.buttonRow}>
            {selectedId != null ? (
              <Pressable style={[styles.button, { backgroundColor: palette.dangerTint }]} onPress={onUnlink}>
                <Text style={[styles.unlinkButtonText, { color: palette.danger }]}>Unlink</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.button, { backgroundColor: palette.secondaryFill }]} onPress={onCancel}>
              <Text style={[styles.cancelButtonText, { color: palette.onSurfaceText }]}>Cancel</Text>
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
    maxHeight: '80%',
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
  emptyText: {
    fontSize: 14,
    lineHeight: 19,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    maxWidth: 140,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
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
  unlinkButtonText: {
    fontWeight: '700',
  },
  cancelButtonText: {
    fontWeight: '700',
  },
});
