export type EventType =
  | 'local'
  | 'off_meta'
  | 'challenge'
  | 'cup'
  | 'regional'
  | 'international'
  | 'world'
  | 'other';

// EVENT_TYPES order drives the Event type chip list
export const EVENT_TYPES: EventType[] = [
  'local',
  'challenge',
  'cup',
  'regional',
  'international',
  'world',
  'off_meta',
  'other',
];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  local: 'Local',
  off_meta: 'Off-Meta',
  challenge: 'Challenge',
  cup: 'Cup',
  regional: 'Regional',
  international: 'International',
  world: 'Worlds',
  other: 'Other',
};

export type RoundResult = 'win' | 'loss' | 'tie' | 'id' | 'bye' | 'no_show' | 'drop';

export type GameResult = 'win' | 'loss' | 'tie';

export type PrizeTier = 'none' | 'prize' | 'first';

export interface RoundRecord {
  id: number;
  eventId: number;
  roundNumber: number;
  result: RoundResult;
  games: GameResult[];
  opponentDeckName: string | null;
  opponentDeckPokemon: string[];
}

export interface NewRound {
  roundNumber: number;
  result: RoundResult;
  games?: GameResult[];
  opponentDeckName?: string | null;
  opponentDeckPokemon?: string[];
}

export interface EventPhotoRecord {
  id: number;
  eventId: number;
  filename: string;
  createdAt: string;
  isThumbnail: boolean;
  /** SHA-256 hex digest of the photo's bytes, used to detect exact-duplicate
   * photos on import. Null for photos saved before this field existed. */
  hash: string | null;
}

export interface EventRecord {
  id: number;
  date: string; // ISO date, yyyy-mm-dd
  eventType: EventType;
  location: string | null;
  /** Optional override name (e.g. "Lost Box"); the deck Pokémon tags are the
   * primary identifier when this is unset — see formatDeckTitle. */
  deckName: string | null;
  /** Pokémon names tagged for the player's own deck (see RoundRecord note). */
  deckPokemon: string[];
  placement: number | null;
  /** Total players in the event, for "placed Nth out of M" — only meaningful
   * alongside `placement`. */
  placementTotal: number | null;
  prizeTier: PrizeTier;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rounds: RoundRecord[];
  /** Round numbers after which a visual divider sits (e.g. Swiss vs Top
   * Cut) — a divider with value N sits between round N and round N+1. */
  roundDividers: number[];
  photos: EventPhotoRecord[];
}

export interface NewEvent {
  date: string;
  eventType: EventType;
  location?: string | null;
  deckName?: string | null;
  deckPokemon?: string[];
  placement?: number | null;
  placementTotal?: number | null;
  prizeTier?: PrizeTier;
  notes?: string | null;
  rounds: NewRound[];
  roundDividers?: number[];
}

export interface EventTally {
  wins: number;
  losses: number;
  ties: number;
}

export interface MarkerRecord {
  id: number;
  date: string; // ISO date, yyyy-mm-dd
  title: string;
  note: string | null;
  /** Hex color, one of MARKER_COLORS (utils/markerColors.ts). */
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewMarker {
  date: string;
  title: string;
  note?: string | null;
  color: string;
}
