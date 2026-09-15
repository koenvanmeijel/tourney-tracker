import type { EventRecord, RoundRecord } from '@/models/types';
import { roundHasOpponent, tallyableResult } from '@/utils/rounds';

export type MatchMode = 'strict' | 'relaxed';

export interface OpponentDeckGroup {
  key: string;
  label: string;
  /** Up to two Pokémon to render as sprites for this group. */
  spritePokemon: string[];
  wins: number;
  losses: number;
  ties: number;
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
      label: sorted.join(' / '),
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
        group = { key: identity.key, label: identity.label, spritePokemon: identity.sprites, wins: 0, losses: 0, ties: 0 };
        groups.set(identity.key, group);
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
    .sort((a, b) => groupRoundCount(b) - groupRoundCount(a) || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export interface MatchupSummary {
  best: OpponentDeckGroup | null;
  worst: OpponentDeckGroup | null;
}

export function bestAndWorstMatchup(groups: OpponentDeckGroup[], threshold: number): MatchupSummary {
  const eligible = groups.filter((group) => groupRoundCount(group) >= threshold);
  if (eligible.length === 0) {
    return { best: null, worst: null };
  }
  const sorted = [...eligible].sort((a, b) => groupPointsRate(b) - groupPointsRate(a));
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}
