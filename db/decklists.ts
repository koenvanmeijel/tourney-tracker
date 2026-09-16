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

export async function listDecklists(): Promise<DecklistRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DecklistRow>('SELECT * FROM decklists ORDER BY updated_at DESC, id DESC');
  return rows.map(rowToDecklist);
}

export async function createDecklist(input: NewDecklist): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO decklists (deck_name, pokemon_names, decklist_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    input.deckName,
    JSON.stringify(input.pokemonNames ?? []),
    input.decklistText,
    now,
    now
  );
  return result.lastInsertRowId;
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
