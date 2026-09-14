import type { GameResult, RoundResult } from '@/models/types';

export const GAME_RESULTS: GameResult[] = ['win', 'loss', 'tie'];

function isGameResult(value: unknown): value is GameResult {
  return typeof value === 'string' && (GAME_RESULTS as string[]).includes(value);
}

export function parseGameResults(value: unknown): GameResult[] {
  return Array.isArray(value) ? value.filter(isGameResult) : [];
}

export function roundHasGames(result: RoundResult): boolean {
  return result === 'win' || result === 'loss' || result === 'tie';
}

export function roundHasOpponent(result: RoundResult): boolean {
  return result !== 'bye' && result !== 'drop';
}

export function deriveRoundResult(games: GameResult[]): RoundResult {
  const wins = games.filter((game) => game === 'win').length;
  const losses = games.filter((game) => game === 'loss').length;
  if (wins > losses) return 'win';
  if (losses > wins) return 'loss';
  return 'tie';
}

export function tallyableResult(result: RoundResult): 'win' | 'loss' | 'tie' | null {
  if (result === 'drop') return null;
  if (result === 'id') return 'tie';
  if (result === 'bye' || result === 'no_show') return 'win';
  return result;
}

const OPPONENT_PLACEHOLDERS: Partial<Record<RoundResult, string>> = {
  id: 'ID (Intentional Draw)',
  no_show: 'No Show',
  bye: 'Bye',
  drop: 'Drop',
};

export function opponentPlaceholder(result: RoundResult): string {
  return OPPONENT_PLACEHOLDERS[result] ?? 'No opponent recorded';
}
