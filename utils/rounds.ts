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

const ROUND_RESULT_SHORT: Record<RoundResult, string> = {
  win: 'W',
  loss: 'L',
  tie: 'T',
  id: 'ID',
  bye: 'BYE',
  no_show: 'NS',
  drop: 'DROP',
};

const GAME_RESULT_SHORT: Record<GameResult, string> = { win: 'W', loss: 'L', tie: 'T' };

/** e.g. "WLW" for a bo3 with games recorded, or the short code (e.g. "BYE")
 * when a round has no game-by-game detail. */
export function roundResultLabel(result: RoundResult, games: GameResult[]): string {
  return games.length > 0 ? games.map((game) => GAME_RESULT_SHORT[game]).join('') : ROUND_RESULT_SHORT[result];
}
