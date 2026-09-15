import JSZip from 'jszip';

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
import { readPhotoBytes } from '@/utils/eventPhotoStorage';
import {
  buildPhotoZipEntryName,
  eventPhotoZipKey,
  groupByPhotoZipKey,
  IMAGE_EXTENSIONS,
  parsePhotoZipEntryName,
  photoZipKeyId,
  type ParsedPhotoZipEntryName,
} from '@/utils/photoZip';
import { parseGameResults } from '@/utils/rounds';

export const EXPORT_FORMAT = 'tourney-tracker-backup';
/** Bump this whenever the *shape* of the export JSON changes in a way an
 * older parser couldn't read (a field renamed/restructured, a value's
 * meaning changed) — and add a migration below. */
export const EXPORT_VERSION = 5;

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
      roundDividers: event.roundDividers,
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

const ROUND_RESULTS: RoundResult[] = ['win', 'loss', 'tie', 'id', 'bye', 'no_show', 'drop'];
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

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];
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
    roundDividers: numberArray(event.roundDividers),
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

const BACKUP_JSON_ENTRY_NAME = 'backup.json';

function photoFileExtension(filename: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(filename);
  return match ? match[0] : '.jpg';
}

/** An event whose photos couldn't be included because another event shares
 * its exact date/type/location, making the filename convention ambiguous. */
export interface PhotoExportCollision {
  events: EventRecord[];
}

export interface BackupZipResult {
  zip: Uint8Array;
  /** Event groups whose photos were left out of the zip - see PhotoExportCollision. */
  collisions: PhotoExportCollision[];
}

/** Builds the "export logs + photos" zip: backup.json plus every photo,
 * renamed per the photo-zip convention. When two or more events share the
 * exact same date/type/location, their photos can't be told apart by
 * filename alone, so all of them are left out and reported instead of
 * guessed. */
export async function buildBackupZip(events: EventRecord[], markers: MarkerRecord[]): Promise<BackupZipResult> {
  const payload = buildExportPayload(events, markers);
  const zip = new JSZip();
  zip.file(BACKUP_JSON_ENTRY_NAME, JSON.stringify(payload, null, 2));

  const eventsWithPhotos = events.filter((event) => event.photos.length > 0);
  const groups = groupByPhotoZipKey(eventsWithPhotos, (event) =>
    eventPhotoZipKey(event.date, event.eventType, event.location)
  );

  const collisions: PhotoExportCollision[] = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      collisions.push({ events: group });
      continue;
    }

    const event = group[0];
    const thumbnail = event.photos.find((photo) => photo.isThumbnail) ?? event.photos[0];
    let nextIndex = 2;
    for (const photo of event.photos) {
      const index = photo.id === thumbnail.id ? 1 : nextIndex++;
      const name = buildPhotoZipEntryName(
        { ...eventPhotoZipKey(event.date, event.eventType, event.location), index },
        photoFileExtension(photo.filename)
      );
      zip.file(name, await readPhotoBytes(photo.filename));
    }
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return { zip: zipBytes, collisions };
}

export interface ZipPhotoEntry extends ParsedPhotoZipEntryName {
  /** The filename as it appeared in the zip (for diagnostics/skip reports). */
  filename: string;
  data: Uint8Array;
}

export interface ParsedBackupZip {
  /** null when the zip has no backup.json - a hand-built, photos-only zip. */
  payload: ImportPayload | null;
  photoEntries: ZipPhotoEntry[];
  /** Files in the zip that aren't backup.json and don't parse as a photo
   * filename at all (ignored on import, surfaced for transparency). */
  unrecognizedFiles: string[];
}

/** Parses an imported "export logs + photos" zip (or a hand-built,
 * photos-only zip using the same filename convention). */
export async function parseBackupZip(bytes: Uint8Array): Promise<ParsedBackupZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error('That file is not a valid .zip archive.');
  }

  let payload: ImportPayload | null = null;
  const jsonEntry = zip.file(BACKUP_JSON_ENTRY_NAME);
  if (jsonEntry) {
    payload = parseImportPayload(await jsonEntry.async('string'));
  }

  const photoEntries: ZipPhotoEntry[] = [];
  const unrecognizedFiles: string[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name === BACKUP_JSON_ENTRY_NAME) {
      continue;
    }
    const parsed = parsePhotoZipEntryName(entry.name);
    if (!parsed || !IMAGE_EXTENSIONS.has(parsed.extension.toLowerCase())) {
      unrecognizedFiles.push(entry.name);
      continue;
    }
    photoEntries.push({ ...parsed, filename: entry.name, data: await entry.async('uint8array') });
  }

  return { payload, photoEntries, unrecognizedFiles };
}

export type PhotoMatchTarget =
  | { kind: 'imported'; importedIndex: number }
  | { kind: 'existing'; eventId: number };

export interface PhotoMatch {
  entry: ZipPhotoEntry;
  target: PhotoMatchTarget;
}

export interface UnmatchedPhoto {
  entry: ZipPhotoEntry;
  reason: 'no-matching-event' | 'ambiguous-multiple-events';
}

export interface PhotoMatchResult {
  matched: PhotoMatch[];
  unmatched: UnmatchedPhoto[];
}

export function matchPhotoEntries(
  entries: ZipPhotoEntry[],
  candidates: { key: string; target: PhotoMatchTarget }[]
): PhotoMatchResult {
  const byKey = new Map<string, PhotoMatchTarget[]>();
  for (const candidate of candidates) {
    const existing = byKey.get(candidate.key);
    if (existing) {
      existing.push(candidate.target);
    } else {
      byKey.set(candidate.key, [candidate.target]);
    }
  }

  const matched: PhotoMatch[] = [];
  const unmatched: UnmatchedPhoto[] = [];
  for (const entry of entries) {
    const key = photoZipKeyId(entry);
    const targets = byKey.get(key) ?? [];
    if (targets.length === 1) {
      matched.push({ entry, target: targets[0] });
    } else {
      unmatched.push({ entry, reason: targets.length === 0 ? 'no-matching-event' : 'ambiguous-multiple-events' });
    }
  }
  return { matched, unmatched };
}
