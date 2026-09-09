import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from './client';
import type { EventPhotoRecord } from '@/models/types';
import { deletePhotoFile } from '@/utils/eventPhotoStorage';

interface EventPhotoRow {
  id: number;
  event_id: number;
  filename: string;
  created_at: string;
  position: number;
}

function rowToPhoto(row: EventPhotoRow): EventPhotoRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    filename: row.filename,
    createdAt: row.created_at,
  };
}

export async function listPhotosForEvent(eventId: number): Promise<EventPhotoRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventPhotoRow>(
    'SELECT * FROM event_photos WHERE event_id = ? ORDER BY position ASC, id ASC',
    eventId
  );
  return rows.map(rowToPhoto);
}

export async function listPhotosForEvents(eventIds: number[]): Promise<Map<number, EventPhotoRecord[]>> {
  const photosByEvent = new Map<number, EventPhotoRecord[]>();
  if (eventIds.length === 0) {
    return photosByEvent;
  }

  const db = await getDb();
  const placeholders = eventIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<EventPhotoRow>(
    `SELECT * FROM event_photos WHERE event_id IN (${placeholders}) ORDER BY position ASC, id ASC`,
    eventIds
  );

  for (const row of rows) {
    const photo = rowToPhoto(row);
    const existing = photosByEvent.get(photo.eventId);
    if (existing) {
      existing.push(photo);
    } else {
      photosByEvent.set(photo.eventId, [photo]);
    }
  }
  return photosByEvent;
}

export async function addEventPhoto(eventId: number, filename: string): Promise<EventPhotoRecord> {
  const db = await getDb();
  const now = new Date().toISOString();
  const maxPosition = await db.getFirstAsync<{ maxPosition: number | null }>(
    'SELECT MAX(position) AS maxPosition FROM event_photos WHERE event_id = ?',
    eventId
  );
  const position = (maxPosition?.maxPosition ?? -1) + 1;
  const result = await db.runAsync(
    'INSERT INTO event_photos (event_id, filename, created_at, position) VALUES (?, ?, ?, ?)',
    eventId,
    filename,
    now,
    position
  );
  return { id: result.lastInsertRowId, eventId, filename, createdAt: now };
}

export async function reorderEventPhotos(eventId: number, photoIds: number[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [index, photoId] of photoIds.entries()) {
      await db.runAsync(
        'UPDATE event_photos SET position = ? WHERE id = ? AND event_id = ?',
        index,
        photoId,
        eventId
      );
    }
  });
}

export async function removeEventPhoto(photoId: number): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventPhotoRow>('SELECT * FROM event_photos WHERE id = ?', photoId);
  if (!row) {
    return;
  }
  await db.runAsync('DELETE FROM event_photos WHERE id = ?', photoId);
  deletePhotoFile(row.filename);
}

export async function deletePhotoFilesForEvents(db: SQLiteDatabase, eventIds: number[]): Promise<void> {
  if (eventIds.length === 0) {
    return;
  }
  const placeholders = eventIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<EventPhotoRow>(
    `SELECT * FROM event_photos WHERE event_id IN (${placeholders})`,
    eventIds
  );
  for (const row of rows) {
    deletePhotoFile(row.filename);
  }
}

export async function deleteAllPhotoFiles(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<EventPhotoRow>('SELECT * FROM event_photos');
  for (const row of rows) {
    deletePhotoFile(row.filename);
  }
}
