import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from './client';
import { deleteAllPhotoFiles, deletePhotoFilesForEvents, listPhotosForEvent, listPhotosForEvents } from './eventPhotos';
import type {
  EventPhotoRecord,
  EventRecord,
  EventTally,
  EventType,
  NewEvent,
  PrizeTier,
  RoundRecord,
  RoundResult,
} from '@/models/types';
import { parseGameResults, tallyableResult } from '@/utils/rounds';

interface EventRow {
  id: number;
  date: string;
  event_type: string;
  location: string | null;
  deck_name: string | null;
  deck_pokemon: string;
  placement: number | null;
  placement_total: number | null;
  prize_tier: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RoundRow {
  id: number;
  event_id: number;
  round_number: number;
  result: string;
  games: string;
  opponent_deck_name: string | null;
  opponent_deck_pokemon: string;
}

function parsePokemonList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseGamesColumn(json: string): ReturnType<typeof parseGameResults> {
  try {
    return parseGameResults(JSON.parse(json));
  } catch {
    return [];
  }
}

function rowToRound(row: RoundRow): RoundRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    roundNumber: row.round_number,
    result: row.result as RoundResult,
    games: parseGamesColumn(row.games),
    opponentDeckName: row.opponent_deck_name,
    opponentDeckPokemon: parsePokemonList(row.opponent_deck_pokemon),
  };
}

function rowToEvent(row: EventRow, rounds: RoundRecord[], photos: EventPhotoRecord[]): EventRecord {
  return {
    id: row.id,
    date: row.date,
    eventType: row.event_type as EventType,
    location: row.location,
    deckName: row.deck_name,
    deckPokemon: parsePokemonList(row.deck_pokemon),
    placement: row.placement,
    placementTotal: row.placement_total,
    prizeTier: row.prize_tier as PrizeTier,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rounds,
    photos,
  };
}

/** All events, most recent first, each with its rounds/photos attached. */
export async function listEvents(): Promise<EventRecord[]> {
  const db = await getDb();
  const eventRows = await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY date DESC, id DESC');
  if (eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((row) => row.id);
  const placeholders = eventIds.map(() => '?').join(',');
  const [roundRows, photosByEvent] = await Promise.all([
    db.getAllAsync<RoundRow>(
      `SELECT * FROM rounds WHERE event_id IN (${placeholders}) ORDER BY round_number ASC`,
      eventIds
    ),
    listPhotosForEvents(eventIds),
  ]);

  const roundsByEvent = new Map<number, RoundRecord[]>();
  for (const row of roundRows) {
    const round = rowToRound(row);
    const existing = roundsByEvent.get(round.eventId);
    if (existing) {
      existing.push(round);
    } else {
      roundsByEvent.set(round.eventId, [round]);
    }
  }

  return eventRows.map((row) =>
    rowToEvent(row, roundsByEvent.get(row.id) ?? [], photosByEvent.get(row.id) ?? [])
  );
}

export async function getEvent(id: number): Promise<EventRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventRow>('SELECT * FROM events WHERE id = ?', id);
  if (!row) {
    return null;
  }

  const [roundRows, photos] = await Promise.all([
    db.getAllAsync<RoundRow>('SELECT * FROM rounds WHERE event_id = ? ORDER BY round_number ASC', id),
    listPhotosForEvent(id),
  ]);
  return rowToEvent(row, roundRows.map(rowToRound), photos);
}

/** A NewEvent plus bookkeeping timestamps — used when restoring a backup. */
export interface NewEventWithTimestamps extends NewEvent {
  createdAt?: string;
  updatedAt?: string;
}

async function insertEvent(
  db: SQLiteDatabase,
  input: NewEventWithTimestamps,
  fallbackTimestamp: string
): Promise<number> {
  const createdAt = input.createdAt ?? fallbackTimestamp;
  const updatedAt = input.updatedAt ?? fallbackTimestamp;

  const result = await db.runAsync(
    `INSERT INTO events
       (date, event_type, location, deck_name, deck_pokemon, placement, placement_total, prize_tier, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.date,
    input.eventType,
    input.location ?? null,
    input.deckName ?? null,
    JSON.stringify(input.deckPokemon ?? []),
    input.placement ?? null,
    input.placementTotal ?? null,
    input.prizeTier ?? 'none',
    input.notes ?? null,
    createdAt,
    updatedAt
  );
  const eventId = result.lastInsertRowId;

  for (const round of input.rounds) {
    await db.runAsync(
      `INSERT INTO rounds (event_id, round_number, result, games, opponent_deck_name, opponent_deck_pokemon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      eventId,
      round.roundNumber,
      round.result,
      JSON.stringify(round.games ?? []),
      round.opponentDeckName ?? null,
      JSON.stringify(round.opponentDeckPokemon ?? [])
    );
  }

  return eventId;
}

export async function createEvent(input: NewEvent): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let eventId = 0;

  await db.withTransactionAsync(async () => {
    eventId = await insertEvent(db, input, now);
  });

  return eventId;
}

export async function replaceAllEvents(events: NewEventWithTimestamps[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await deleteAllPhotoFiles(db);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM events'); // cascades to rounds/event_photos
    for (const event of events) {
      await insertEvent(db, event, now);
    }
  });
}

export async function addEvents(events: NewEventWithTimestamps[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const event of events) {
      await insertEvent(db, event, now);
    }
  });
}

export async function updateEvent(id: number, input: NewEvent): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE events
       SET date = ?, event_type = ?, location = ?, deck_name = ?, deck_pokemon = ?,
           placement = ?, placement_total = ?, prize_tier = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      input.date,
      input.eventType,
      input.location ?? null,
      input.deckName ?? null,
      JSON.stringify(input.deckPokemon ?? []),
      input.placement ?? null,
      input.placementTotal ?? null,
      input.prizeTier ?? 'none',
      input.notes ?? null,
      now,
      id
    );

    await db.runAsync('DELETE FROM rounds WHERE event_id = ?', id);

    for (const round of input.rounds) {
      await db.runAsync(
        `INSERT INTO rounds (event_id, round_number, result, games, opponent_deck_name, opponent_deck_pokemon)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        round.roundNumber,
        round.result,
        JSON.stringify(round.games ?? []),
        round.opponentDeckName ?? null,
        JSON.stringify(round.opponentDeckPokemon ?? [])
      );
    }
  });
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  // Deletes the photo files before the cascade wipes their DB rows - needed.
  await deletePhotoFilesForEvents(db, [id]);
  await db.runAsync('DELETE FROM events WHERE id = ?', id); // cascades to rounds/event_photos
}

export function tallyRounds(rounds: RoundRecord[]): EventTally {
  return rounds.reduce<EventTally>(
    (tally, round) => {
      const result = tallyableResult(round.result);
      if (result === 'win') tally.wins += 1;
      else if (result === 'loss') tally.losses += 1;
      else tally.ties += 1;
      return tally;
    },
    { wins: 0, losses: 0, ties: 0 }
  );
}
