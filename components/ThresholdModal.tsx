import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import type { MatchMode } from '@/utils/opponentDecks';

interface ThresholdModalProps {
  visible: boolean;
  matchMode: MatchMode;
  threshold: number;
  onApply: (matchMode: MatchMode, threshold: number) => void;
  onClose: () => void;
}

export function ThresholdModal({ visible, matchMode, threshold, onApply, onClose }: ThresholdModalProps) {
  const { palette } = useTheme();
  const [pendingMode, setPendingMode] = useState<MatchMode>(matchMode);
  const [thresholdText, setThresholdText] = useState(String(threshold));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPendingMode(matchMode);
      setThresholdText(String(threshold));
      setError(null);
    }
  }, [visible, matchMode, threshold]);

  function handleApply() {
    const parsed = Number.parseInt(thresholdText, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError('Enter a whole number of 1 or more.');
      return;
    }
    onApply(pendingMode, parsed);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: palette.onSurfaceText }]}>Matchup settings</Text>

          <Text style={[styles.sectionLabel, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
            Opponent deck matching
          </Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[
                styles.modeChip,
                { borderColor: palette.border },
                pendingMode === 'strict' && { backgroundColor: palette.accent, borderColor: palette.accent },
              ]}
              onPress={() => setPendingMode('strict')}>
              <Text
                style={[
                  styles.modeChipText,
                  { color: palette.onSurfaceText },
                  pendingMode === 'strict' && { color: palette.onAccentText },
                ]}>
                Strict
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeChip,
                { borderColor: palette.border },
                pendingMode === 'relaxed' && { backgroundColor: palette.accent, borderColor: palette.accent },
              ]}
              onPress={() => setPendingMode('relaxed')}>
              <Text
                style={[
                  styles.modeChipText,
                  { color: palette.onSurfaceText },
                  pendingMode === 'relaxed' && { color: palette.onAccentText },
                ]}>
                Relaxed
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
            {pendingMode === 'strict'
              ? 'Exact Pokémon combos stay separate decks.\n"Dragapult/Dusknoir" and "Dragapult/Blaziken" count separately.'
              : 'Decks are grouped by their first tagged Pokémon.\n"Dragapult/Dusknoir" and "Dragapult/Blaziken" combine.'}
          </Text>

          <Text style={[styles.sectionLabel, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
            Matchup threshold
          </Text>
          <Text style={[styles.hint, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
            Minimum rounds played against a deck before it can show up as a best/worst matchup.
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: palette.onSurfaceText, backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            value={thresholdText}
            onChangeText={setThresholdText}
            keyboardType="number-pad"
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
    gap: 8,
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
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
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
