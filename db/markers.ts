import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from './client';
import type { MarkerRecord, NewMarker } from '@/models/types';

interface MarkerRow {
  id: number;
  date: string;
  title: string;
  note: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

function rowToMarker(row: MarkerRow): MarkerRecord {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    note: row.note,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** A NewMarker plus bookkeeping timestamps — used when restoring a backup,
 * mirroring NewEventWithTimestamps in db/events.ts. */
export interface NewMarkerWithTimestamps extends NewMarker {
  createdAt?: string;
  updatedAt?: string;
}

export async function listMarkers(): Promise<MarkerRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MarkerRow>('SELECT * FROM markers ORDER BY date DESC, id DESC');
  return rows.map(rowToMarker);
}

async function insertMarker(
  db: SQLiteDatabase,
  input: NewMarkerWithTimestamps,
  fallbackTimestamp: string
): Promise<number> {
  const createdAt = input.createdAt ?? fallbackTimestamp;
  const updatedAt = input.updatedAt ?? fallbackTimestamp;

  const result = await db.runAsync(
    `INSERT INTO markers (date, title, note, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.date,
    input.title,
    input.note ?? null,
    input.color,
    createdAt,
    updatedAt
  );
  return result.lastInsertRowId;
}

export async function createMarker(input: NewMarker): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  let id = 0;

  await db.withTransactionAsync(async () => {
    id = await insertMarker(db, input, now);
  });

  return id;
}

export async function updateMarker(id: number, input: NewMarker): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE markers SET date = ?, title = ?, note = ?, color = ?, updated_at = ? WHERE id = ?`,
    input.date,
    input.title,
    input.note ?? null,
    input.color,
    now,
    id
  );
}

export async function deleteMarker(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM markers WHERE id = ?', id);
}

export async function replaceAllMarkers(markers: NewMarkerWithTimestamps[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM markers');
    for (const marker of markers) {
      await insertMarker(db, marker, now);
    }
  });
}

export async function addMarkers(markers: NewMarkerWithTimestamps[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const marker of markers) {
      await insertMarker(db, marker, now);
    }
  });
}
