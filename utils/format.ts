export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatDeckTitle(deckName: string | null, deckPokemon: string[]): string {
  const pokemonLabel = deckPokemon.join('/');
  if (deckName && pokemonLabel) return `${deckName} (${pokemonLabel})`;
  if (deckName) return deckName;
  if (pokemonLabel) return pokemonLabel;
  return 'Unnamed deck';
}

export function formatDeckTitleOrNull(deckName: string | null, deckPokemon: string[]): string | null {
  if (!deckName && deckPokemon.length === 0) return null;
  return formatDeckTitle(deckName, deckPokemon);
}

export function formatDeckLabel(deckName: string | null, deckPokemon: string[]): string {
  if (deckName) return deckName;
  return deckPokemon.join('/') || 'Unnamed deck';
}

export function formatDeckLabelOrNull(deckName: string | null, deckPokemon: string[]): string | null {
  if (!deckName && deckPokemon.length === 0) return null;
  return formatDeckLabel(deckName, deckPokemon);
}

export function formatPlacement(placement: number | null, placementTotal: number | null): string | null {
  if (placement == null) return null;
  const base = `Placed ${ordinal(placement)}`;
  return placementTotal != null ? `${base} out of ${placementTotal}` : base;
}

export function formatPlacementHeadline(placement: number | null, placementTotal: number | null): string | null {
  if (placement == null) return null;
  return placementTotal != null ? `${ordinal(placement)}/${placementTotal}` : ordinal(placement);
}
