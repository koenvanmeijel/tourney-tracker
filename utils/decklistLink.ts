import type { DecklistRecord } from '@/models/types';

export interface SortedDecklistsForLinking {
  /** Decklists ordered with matches first (most shared Pokémon names first),
   * then everything else — each group keeping the incoming
   * (most-recently-updated-first) order, since Array.prototype.sort is
   * stable. */
  sorted: DecklistRecord[];
  /** How many decklists at the front of `sorted` share at least one
   * Pokémon name with `deckPokemon` — lets the picker draw a divider
   * between the matching and non-matching groups. */
  matchingCount: number;
}

/** Orders decklists for the Add/Edit Event link picker: decklists sharing at
 * least one Pokémon name with the event's current Deck Pokémon tags come
 * first (most shared names first), then everything else. */
export function sortDecklistsForLinking(
  decklists: DecklistRecord[],
  deckPokemon: string[]
): SortedDecklistsForLinking {
  if (deckPokemon.length === 0) {
    return { sorted: decklists, matchingCount: 0 };
  }

  const wanted = new Set(deckPokemon.map((name) => name.trim().toLowerCase()));
  const scored = decklists.map((decklist) => ({
    decklist,
    score: decklist.pokemonNames.filter((name) => wanted.has(name.trim().toLowerCase())).length,
  }));
  scored.sort((a, b) => b.score - a.score);

  const matchingCount = scored.filter((entry) => entry.score > 0).length;
  return { sorted: scored.map((entry) => entry.decklist), matchingCount };
}
