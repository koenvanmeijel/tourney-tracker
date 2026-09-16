import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { EVENT_TYPE_LABELS, type EventRecord } from '@/models/types';
import { formatIsoDateForDisplay } from '@/utils/date';

interface EventLinkPickerProps {
  visible: boolean;
  events: EventRecord[];
  selectedIds: number[];
  onToggle: (eventId: number) => void;
  onDone: () => void;
}

export function EventLinkPicker({ visible, events, selectedIds, onToggle, onDone }: EventLinkPickerProps) {
  const { palette } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={onDone}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: palette.onSurfaceText }]}>Link events</Text>

          {events.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
              No events yet.
            </Text>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              renderItem={({ item }) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <Pressable
                    style={[styles.row, selected && { backgroundColor: palette.accentTint }]}
                    onPress={() => onToggle(item.id)}>
                    <Text style={[styles.rowName, { color: palette.onSurfaceText }]} numberOfLines={1}>
                      {formatIsoDateForDisplay(item.date)} · {EVENT_TYPE_LABELS[item.eventType]}
                    </Text>
                    {item.location ? (
                      <Text
                        style={[styles.rowSubtitle, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}
                        numberOfLines={1}>
                        {item.location}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onDone}>
              <Text style={[styles.doneButtonText, { color: palette.onAccentText }]}>Done</Text>
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
  doneButtonText: {
    fontWeight: '700',
  },
});
