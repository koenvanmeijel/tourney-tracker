import type { NewEventWithTimestamps } from '@/db/events';
import type { NewMarkerWithTimestamps } from '@/db/markers';
import {
  EVENT_TYPES,
  type EventRecord,
  type EventType,
  type MarkerRecord,
  type NewRound,
  type PrizeTier,
  type RoundResult,
} from '@/models/types';
import { DEFAULT_MARKER_COLOR, MARKER_COLORS } from '@/utils/markerColors';
import { parseGameResults } from '@/utils/rounds';

export const EXPORT_FORMAT = 'tourney-tracker-backup';
/** Bump this whenever the *shape* of the export JSON changes in a way an
 * older parser couldn't read (a field renamed/restructured, a value's
 * meaning changed) — and add a migration below. */
export const EXPORT_VERSION = 3;

export interface ExportPayload {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  events: NewEventWithTimestamps[];
  markers: NewMarkerWithTimestamps[];
}

export interface ImportPayload {
  events: NewEventWithTimestamps[];
  markers: NewMarkerWithTimestamps[];
}

const PAYLOAD_MIGRATIONS: Record<number, (payload: Record<string, unknown>) => Record<string, unknown>> = {};

function migratePayload(payload: Record<string, unknown>, fromVersion: number): Record<string, unknown> {
  let current = payload;
  for (let version = fromVersion; version < EXPORT_VERSION; version++) {
    current = PAYLOAD_MIGRATIONS[version]?.(current) ?? current;
  }
  return current;
}

export function buildExportPayload(events: EventRecord[], markers: MarkerRecord[]): ExportPayload {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    events: events.map((event) => ({
      date: event.date,
      eventType: event.eventType,
      location: event.location,
      deckName: event.deckName,
      deckPokemon: event.deckPokemon,
      placement: event.placement,
      placementTotal: event.placementTotal,
      prizeTier: event.prizeTier,
      notes: event.notes,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      rounds: event.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        result: round.result,
        games: round.games,
        opponentDeckName: round.opponentDeckName,
        opponentDeckPokemon: round.opponentDeckPokemon,
      })),
    })),
    markers: markers.map((marker) => ({
      date: marker.date,
      title: marker.title,
      note: marker.note,
      color: marker.color,
      createdAt: marker.createdAt,
      updatedAt: marker.updatedAt,
    })),
  };
}

const ROUND_RESULTS: RoundResult[] = ['win', 'loss', 'tie', 'id', 'bye', 'no_show'];
const PRIZE_TIERS: PrizeTier[] = ['none', 'prize', 'first'];

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as string[]).includes(value);
}

function isRoundResult(value: unknown): value is RoundResult {
  return typeof value === 'string' && (ROUND_RESULTS as string[]).includes(value);
}

function isPrizeTier(value: unknown): value is PrizeTier {
  return typeof value === 'string' && (PRIZE_TIERS as string[]).includes(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseRound(raw: unknown, eventIndex: number, roundIndex: number): NewRound {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Event ${eventIndex + 1}, round ${roundIndex + 1} isn't a valid round.`);
  }
  const round = raw as Record<string, unknown>;
  if (typeof round.roundNumber !== 'number' || !isRoundResult(round.result)) {
    throw new Error(`Event ${eventIndex + 1}, round ${roundIndex + 1} is missing its number or result.`);
  }

  return {
    roundNumber: round.roundNumber,
    result: round.result,
    games: parseGameResults(round.games),
    opponentDeckName: typeof round.opponentDeckName === 'string' ? round.opponentDeckName : null,
    opponentDeckPokemon: stringArray(round.opponentDeckPokemon),
  };
}

function parseEvent(raw: unknown, index: number): NewEventWithTimestamps {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Event ${index + 1} isn't a valid event.`);
  }
  const event = raw as Record<string, unknown>;
  if (typeof event.date !== 'string' || !isEventType(event.eventType)) {
    throw new Error(`Event ${index + 1} is missing its date or event type.`);
  }

  const rounds = Array.isArray(event.rounds)
    ? event.rounds.map((round, roundIndex) => parseRound(round, index, roundIndex))
    : [];

  return {
    date: event.date,
    eventType: event.eventType,
    location: typeof event.location === 'string' ? event.location : null,
    deckName: typeof event.deckName === 'string' ? event.deckName : null,
    deckPokemon: stringArray(event.deckPokemon),
    placement: typeof event.placement === 'number' ? event.placement : null,
    placementTotal: typeof event.placementTotal === 'number' ? event.placementTotal : null,
    prizeTier: isPrizeTier(event.prizeTier) ? event.prizeTier : 'none',
    notes: typeof event.notes === 'string' ? event.notes : null,
    createdAt: typeof event.createdAt === 'string' ? event.createdAt : undefined,
    updatedAt: typeof event.updatedAt === 'string' ? event.updatedAt : undefined,
    rounds,
  };
}

function isMarkerColor(value: unknown): value is string {
  return typeof value === 'string' && MARKER_COLORS.some((swatch) => swatch.value === value);
}

function parseMarker(raw: unknown, index: number): NewMarkerWithTimestamps {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Marker ${index + 1} isn't a valid marker.`);
  }
  const marker = raw as Record<string, unknown>;
  if (typeof marker.date !== 'string' || typeof marker.title !== 'string') {
    throw new Error(`Marker ${index + 1} is missing its date or title.`);
  }

  return {
    date: marker.date,
    title: marker.title,
    note: typeof marker.note === 'string' ? marker.note : null,
    color: isMarkerColor(marker.color) ? marker.color : DEFAULT_MARKER_COLOR,
    createdAt: typeof marker.createdAt === 'string' ? marker.createdAt : undefined,
    updatedAt: typeof marker.updatedAt === 'string' ? marker.updatedAt : undefined,
  };
}

/** Parses and validates a backup file's contents. */
export function parseImportPayload(json: string): ImportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error("That file doesn't look like a Tourney Tracker backup.");
  }
  let payload = parsed as Record<string, unknown>;
  if (payload.format !== EXPORT_FORMAT || !Array.isArray(payload.events)) {
    throw new Error("That file doesn't look like a Tourney Tracker backup.");
  }

  // Missing version = 1: guards a hand-edited file. 
  // A version ahead of what this build knows
  // about can't be safely guessed at, so it's refused rather than silently
  // dropping whatever the newer fields meant.
  const version = typeof payload.version === 'number' ? payload.version : 1;
  if (version > EXPORT_VERSION) {
    throw new Error(
      'This backup was made with a newer version of Tourney Tracker. Update the app before importing it.'
    );
  }
  payload = migratePayload(payload, version);
  if (!Array.isArray(payload.events)) {
    throw new Error("That file doesn't look like a Tourney Tracker backup.");
  }

  return {
    events: payload.events.map((event, index) => parseEvent(event, index)),
    markers: Array.isArray(payload.markers)
      ? payload.markers.map((marker, index) => parseMarker(marker, index))
      : [],
  };
}
