import type { EventRecord, RoundRecord } from '@/models/types';
import { roundHasOpponent, tallyableResult } from '@/utils/rounds';

export type MatchMode = 'strict' | 'relaxed';

export function isMatchMode(value: string): value is MatchMode {
  return value === 'strict' || value === 'relaxed';
}

export interface OpponentDeckGroup {
  key: string;
  label: string;
  /** Up to two Pokémon to render as sprites for this group. */
  spritePokemon: string[];
  wins: number;
  losses: number;
  ties: number;
  /** ISO date (yyyy-mm-dd) of the most recent event this opponent was faced
   * in — used to break best/worst matchup ties. */
  lastPlayedDate: string;
}

interface GroupIdentity {
  key: string;
  label: string;
  sprites: string[];
}

function groupIdentity(round: RoundRecord, mode: MatchMode): GroupIdentity | null {
  const pokemon = round.opponentDeckPokemon;
  if (pokemon.length > 0) {
    if (mode === 'relaxed') {
      const primary = pokemon[0];
      return { key: `pokemon:${primary.toLowerCase()}`, label: primary, sprites: [primary] };
    }
    const sorted = [...pokemon].sort((a, b) => a.localeCompare(b));
    return {
      key: `pokemon:${sorted.map((mon) => mon.toLowerCase()).join('/')}`,
      label: pokemon.join(' / '),
      sprites: pokemon.slice(0, 2),
    };
  }
  const name = round.opponentDeckName?.trim();
  if (name) {
    return { key: `name:${name.toLowerCase()}`, label: name, sprites: [] };
  }
  return null;
}

export function groupOpponentRounds(events: EventRecord[], mode: MatchMode): OpponentDeckGroup[] {
  const groups = new Map<string, OpponentDeckGroup>();

  for (const event of events) {
    for (const round of event.rounds) {
      if (!roundHasOpponent(round.result)) continue;
      const tallyResult = tallyableResult(round.result);
      if (!tallyResult) continue;
      const identity = groupIdentity(round, mode);
      if (!identity) continue;

      let group = groups.get(identity.key);
      if (!group) {
        group = {
          key: identity.key,
          label: identity.label,
          spritePokemon: identity.sprites,
          wins: 0,
          losses: 0,
          ties: 0,
          lastPlayedDate: event.date,
        };
        groups.set(identity.key, group);
      } else if (event.date > group.lastPlayedDate) {
        group.lastPlayedDate = event.date;
      }
      if (tallyResult === 'win') group.wins += 1;
      else if (tallyResult === 'loss') group.losses += 1;
      else group.ties += 1;
    }
  }

  return Array.from(groups.values());
}

export function groupRoundCount(group: OpponentDeckGroup): number {
  return group.wins + group.losses + group.ties;
}

export function groupPointsRate(group: OpponentDeckGroup): number {
  const total = groupRoundCount(group);
  if (total === 0) return 0;
  const points = group.wins * 3 + group.ties * 1;
  return points / (total * 3);
}

export function topPlayedGroups(groups: OpponentDeckGroup[], limit: number): OpponentDeckGroup[] {
  return [...groups]
    .sort(
      (a, b) =>
        groupRoundCount(b) - groupRoundCount(a) ||
        groupPointsRate(b) - groupPointsRate(a) ||
        a.label.localeCompare(b.label)
    )
    .slice(0, limit);
}

export interface MatchupSummary {
  best: OpponentDeckGroup | null;
  worst: OpponentDeckGroup | null;
}

/** Among groups tied on points rate, prefers more rounds played, then the
 * one faced most recently. */
function pickTiebreakWinner(candidates: OpponentDeckGroup[]): OpponentDeckGroup {
  return candidates.reduce((champion, candidate) => {
    const roundDiff = groupRoundCount(candidate) - groupRoundCount(champion);
    if (roundDiff !== 0) return roundDiff > 0 ? candidate : champion;
    return candidate.lastPlayedDate > champion.lastPlayedDate ? candidate : champion;
  });
}

export function bestAndWorstMatchup(groups: OpponentDeckGroup[], threshold: number): MatchupSummary {
  const eligible = groups.filter((group) => groupRoundCount(group) >= threshold);
  if (eligible.length === 0) {
    return { best: null, worst: null };
  }
  const maxRate = Math.max(...eligible.map(groupPointsRate));
  const minRate = Math.min(...eligible.map(groupPointsRate));
  const best = pickTiebreakWinner(eligible.filter((group) => groupPointsRate(group) === maxRate));
  const worst = pickTiebreakWinner(eligible.filter((group) => groupPointsRate(group) === minRate));
  return { best, worst };
}
