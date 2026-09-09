import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from './schema';

const DATABASE_NAME = 'tourney-tracker.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

/** Lazily opens the single on-device database, running migrations once. All
 * db/*.ts query functions should go through this rather than opening their
 * own connection. */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      // SQLite defaults foreign keys off per-connection; we rely on
      // ON DELETE CASCADE to clean up rounds when an event is deleted.
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await migrateDbIfNeeded(db);
      return db;
    });
  }
  return dbPromise;
}
