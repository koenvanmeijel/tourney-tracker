import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormTextInput } from '@/components/form/FormTextInput';
import { SelectChips } from '@/components/form/SelectChips';
import { TagInput, type TagInputHandle } from '@/components/form/TagInput';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import type { GameResult, NewRound, RoundResult } from '@/models/types';
import { getRoundResultTheme } from '@/utils/eventTheme';
import { deriveRoundResult, GAME_RESULTS, roundHasGames } from '@/utils/rounds';

const RESULT_LABELS: Record<RoundResult, string> = {
  win: 'Win',
  loss: 'Loss',
  tie: 'Tie',
  id: 'ID',
  bye: 'Bye',
  no_show: 'No Show',
};

const RESULT_OPTION_ORDER: RoundResult[] = ['win', 'loss', 'tie', 'id', 'bye', 'no_show'];

const GAME_RESULT_LABELS: Record<GameResult, string> = { win: 'W', loss: 'L', tie: 'T' };

export interface RoundsEditorHandle {
  flush: () => NewRound[];
}

interface RoundsEditorProps {
  rounds: NewRound[];
  onChange: (rounds: NewRound[]) => void;
}

export const RoundsEditor = forwardRef<RoundsEditorHandle, RoundsEditorProps>(function RoundsEditor(
  { rounds, onChange },
  ref
) {
  const { palette, themeId } = useTheme();
  const resultOptions = useMemo(() => {
    const roundResultTheme = getRoundResultTheme(themeId);
    return RESULT_OPTION_ORDER.map((value) => ({
      value,
      label: RESULT_LABELS[value],
      color: roundResultTheme[value].background,
      textColor: roundResultTheme[value].text,
    }));
  }, [themeId]);
  const gameResultOptions = useMemo(() => {
    const roundResultTheme = getRoundResultTheme(themeId);
    return GAME_RESULTS.map((value) => ({
      value,
      label: GAME_RESULT_LABELS[value],
      color: roundResultTheme[value].background,
      textColor: roundResultTheme[value].text,
    }));
  }, [themeId]);
  const tagInputRefs = useRef<Array<TagInputHandle | null>>([]);
  const focusNewRoundRef = useRef(false);

  useImperativeHandle(ref, () => ({
    flush() {
      return rounds.map((round, index) => ({
        ...round,
        opponentDeckPokemon: tagInputRefs.current[index]?.flush() ?? round.opponentDeckPokemon,
      }));
    },
  }));

  useEffect(() => {
    if (focusNewRoundRef.current) {
      focusNewRoundRef.current = false;
      const frame = requestAnimationFrame(() => {
        tagInputRefs.current[rounds.length - 1]?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [rounds.length]);

  function updateRound(index: number, patch: Partial<NewRound>) {
    const next = rounds.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function updateGames(index: number, games: GameResult[]) {
    updateRound(index, {
      games,
      result: games.length > 0 ? deriveRoundResult(games) : rounds[index].result,
    });
  }

  function addGame(index: number) {
    updateGames(index, [...(rounds[index].games ?? []), 'win']);
  }

  function updateGame(index: number, gameIndex: number, result: GameResult) {
    const next = (rounds[index].games ?? []).slice();
    next[gameIndex] = result;
    updateGames(index, next);
  }

  function removeGame(index: number, gameIndex: number) {
    updateGames(
      index,
      (rounds[index].games ?? []).filter((_, i) => i !== gameIndex)
    );
  }

  function removeRound(index: number) {
    onChange(
      rounds.filter((_, i) => i !== index).map((round, i) => ({ ...round, roundNumber: i + 1 }))
    );
  }

  function addRound() {
    focusNewRoundRef.current = true;
    onChange([
      ...rounds,
      { roundNumber: rounds.length + 1, result: 'win', games: [], opponentDeckName: null, opponentDeckPokemon: [] },
    ]);
  }

  return (
    <View style={styles.container}>
      {rounds.map((round, index) => {
        const nameVisible = round.opponentDeckName != null;
        const games = round.games ?? [];
        const tracking = games.length > 0;

        return (
          <View key={index} style={[styles.roundCard, { borderColor: palette.borderSubtle }]}>
            <View style={styles.roundHeader}>
              <Text style={[styles.roundTitle, { color: palette.onSurfaceText }]}>Round {round.roundNumber}</Text>
              <Pressable onPress={() => removeRound(index)}>
                <Text style={[styles.removeText, { color: palette.danger }]}>Remove</Text>
              </Pressable>
            </View>

            {tracking ? (
              <Text style={[styles.derivedResultText, { color: palette.onSurfaceText }]}>
                Result:{' '}
                <Text style={[styles.derivedResultValue, { color: palette.onSurfaceText }]}>
                  {RESULT_LABELS[round.result]}
                </Text>{' '}
                (from game scores below)
              </Text>
            ) : (
              <SelectChips
                options={resultOptions}
                value={round.result}
                onChange={(result) => updateRound(index, { result })}
                initialVisibleCount={3}
              />
            )}

            {roundHasGames(round.result) ? (
              tracking ? (
                <View style={styles.gamesBlock}>
                  {games.map((game, gameIndex) => (
                    <View key={gameIndex} style={styles.gameRow}>
                      <Text style={[styles.gameLabel, { color: palette.onSurfaceText }]}>Game {gameIndex + 1}</Text>
                      <SelectChips
                        options={gameResultOptions}
                        value={game}
                        onChange={(result) => updateGame(index, gameIndex, result)}
                      />
                      <Pressable onPress={() => removeGame(index, gameIndex)} hitSlop={8}>
                        <Text style={[styles.removeText, { color: palette.danger }]}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                  <View style={styles.gamesActionsRow}>
                    <Pressable style={styles.addGameButton} onPress={() => addGame(index)}>
                      <Text style={[styles.addGameText, { color: palette.accent }]}>+ Add game</Text>
                    </Pressable>
                    <Pressable onPress={() => updateGames(index, [])}>
                      <Text style={[styles.clearGamesText, { color: palette.danger }]}>Clear</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.trackGamesButton} onPress={() => addGame(index)}>
                  <Text style={[styles.trackGamesText, { color: palette.accent }]}>+ Track game scores</Text>
                </Pressable>
              )
            ) : null}

            <TagInput
              ref={(handle) => {
                tagInputRefs.current[index] = handle;
              }}
              tags={round.opponentDeckPokemon ?? []}
              onChange={(tags) => updateRound(index, { opponentDeckPokemon: tags })}
              placeholder="Opponent Pokémon (optional)"
              trailingAction={{
                label: nameVisible ? 'Remove name' : '+ Name',
                onPress: () => updateRound(index, { opponentDeckName: nameVisible ? null : '' }),
              }}
            />
            {nameVisible ? (
              <FormTextInput
                value={round.opponentDeckName ?? ''}
                onChangeText={(text) => updateRound(index, { opponentDeckName: text })}
                placeholder="Opponent's deck name (optional)"
              />
            ) : null}
          </View>
        );
      })}
      <Pressable style={[styles.addRoundButton, { backgroundColor: palette.accentTint }]} onPress={addRound}>
        <Text style={[styles.addRoundText, { color: palette.accent }]}>+ Add round</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  roundCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundTitle: {
    fontWeight: '600',
    fontSize: 15,
  },
  removeText: {
    fontSize: 14,
  },
  derivedResultText: {
    fontSize: 14,
    opacity: MUTED_TEXT_OPACITY,
  },
  derivedResultValue: {
    fontWeight: '700',
    opacity: 1,
  },
  gamesBlock: {
    gap: 6,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameLabel: {
    fontSize: 13,
    opacity: MUTED_TEXT_OPACITY,
    width: 56,
  },
  gamesActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addGameButton: {
    alignSelf: 'flex-start',
  },
  addGameText: {
    fontWeight: '600',
    fontSize: 13,
  },
  clearGamesText: {
    fontSize: 13,
  },
  trackGamesButton: {
    alignSelf: 'flex-start',
  },
  trackGamesText: {
    fontWeight: '600',
    fontSize: 13,
  },
  addRoundButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addRoundText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
