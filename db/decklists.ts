import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from './client';
import type { DecklistRecord, NewDecklist } from '@/models/types';

interface DecklistRow {
  id: number;
  deck_name: string;
  pokemon_names: string;
  decklist_text: string;
  created_at: string;
  updated_at: string;
}

function rowToDecklist(row: DecklistRow): DecklistRecord {
  return {
    id: row.id,
    deckName: row.deck_name,
    pokemonNames: JSON.parse(row.pokemon_names),
    decklistText: row.decklist_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** A NewDecklist plus bookkeeping timestamps — used when restoring a backup,
 * mirroring NewMarkerWithTimestamps in db/markers.ts. */
export interface NewDecklistWithTimestamps extends NewDecklist {
  createdAt?: string;
  updatedAt?: string;
}

export async function listDecklists(): Promise<DecklistRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DecklistRow>('SELECT * FROM decklists ORDER BY updated_at DESC, id DESC');
  return rows.map(rowToDecklist);
}

async function insertDecklist(
  db: SQLiteDatabase,
  input: NewDecklistWithTimestamps,
  fallbackTimestamp: string
): Promise<number> {
  const createdAt = input.createdAt ?? fallbackTimestamp;
  const updatedAt = input.updatedAt ?? fallbackTimestamp;

  const result = await db.runAsync(
    `INSERT INTO decklists (deck_name, pokemon_names, decklist_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    input.deckName,
    JSON.stringify(input.pokemonNames ?? []),
    input.decklistText,
    createdAt,
    updatedAt
  );
  return result.lastInsertRowId;
}

export async function createDecklist(input: NewDecklist): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let id = 0;

  await db.withTransactionAsync(async () => {
    id = await insertDecklist(db, input, now);
  });

  return id;
}

export async function updateDecklist(id: number, input: NewDecklist): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE decklists SET deck_name = ?, pokemon_names = ?, decklist_text = ?, updated_at = ? WHERE id = ?`,
    input.deckName,
    JSON.stringify(input.pokemonNames ?? []),
    input.decklistText,
    now,
    id
  );
}

export async function deleteDecklist(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM decklists WHERE id = ?', id);
}

export async function replaceAllDecklists(decklists: NewDecklistWithTimestamps[]): Promise<number[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const ids: number[] = [];

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM decklists'); // events referencing these are unlinked via ON DELETE SET NULL
    for (const decklist of decklists) {
      ids.push(await insertDecklist(db, decklist, now));
    }
  });
  return ids;
}

export async function addDecklists(decklists: NewDecklistWithTimestamps[]): Promise<number[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const ids: number[] = [];

  await db.withTransactionAsync(async () => {
    for (const decklist of decklists) {
      ids.push(await insertDecklist(db, decklist, now));
    }
  });
  return ids;
}
