import type { SQLiteDatabase } from 'expo-sqlite';

/** Bump this and add another `if (currentVersion === N)` block below when the
 * schema needs to change — never edit a past migration. */
export const DATABASE_VERSION = 7;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        event_type TEXT NOT NULL,
        location TEXT,
        deck_name TEXT NOT NULL,
        deck_pokemon TEXT NOT NULL DEFAULT '[]',
        placement INTEGER,
        prize_tier TEXT NOT NULL DEFAULT 'none',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        result TEXT NOT NULL,
        opponent_deck_name TEXT,
        opponent_deck_pokemon TEXT NOT NULL DEFAULT '[]'
      );

      CREATE INDEX idx_rounds_event_id ON rounds(event_id);
    `);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    // deck_name drops its NOT NULL (deck Pokémon tags are now the primary
    // identifier, deck_name is an optional override), and
    // events gain placement_total for "placed Nth out of M". SQLite can't
    // ALTER COLUMN to drop NOT NULL, so the table is rebuilt.
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.execAsync(`
      CREATE TABLE events_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        event_type TEXT NOT NULL,
        location TEXT,
        deck_name TEXT,
        deck_pokemon TEXT NOT NULL DEFAULT '[]',
        placement INTEGER,
        placement_total INTEGER,
        prize_tier TEXT NOT NULL DEFAULT 'none',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO events_new
        (id, date, event_type, location, deck_name, deck_pokemon, placement, placement_total, prize_tier, notes, created_at, updated_at)
      SELECT id, date, event_type, location, deck_name, deck_pokemon, placement, NULL, prize_tier, notes, created_at, updated_at
      FROM events;

      DROP TABLE events;
      ALTER TABLE events_new RENAME TO events;
    `);
    await db.execAsync('PRAGMA foreign_keys = ON;');
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    // Per-round game detail: a round can now optionally
    // carry the actual game-by-game sequence (e.g. "WLW" for a bo3), stored
    // as a JSON array the same way deck_pokemon/opponent_deck_pokemon
    // already are. Purely additive, unlike the version 1->2 rebuild — SQLite
    // can ADD COLUMN without touching existing rows. `result` itself stays
    // TEXT with no column change; it now also accepts 'id'/'bye'/'no_show'
    // at the app level, values SQLite doesn't validate either way.
    await db.execAsync(`ALTER TABLE rounds ADD COLUMN games TEXT NOT NULL DEFAULT '[]';`);
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    // Markers: lightweight, non-tournament timeline annotations —
    // a new, unrelated table, not an extension of events.
    await db.execAsync(`
      CREATE TABLE markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        note TEXT,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_markers_date ON markers(date);
    `);
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    // A small key-value store for on-device app preferences — starting
    // with the selected theme. Deliberately its own
    // table rather than a column bolted onto some other one: preferences
    // aren't tournament data, so they're also deliberately left out of the
    // export/import backup format (utils/backup.ts) — a restored backup
    // shouldn't silently change which theme is active.
    await db.execAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    currentVersion = 5;
  }

  if (currentVersion === 5) {
    // Photo attachments — one event can have
    // several. Only the filename is stored here; the actual image file
    // lives in the app's own document directory (see
    // utils/eventPhotoStorage.ts), addressed by that filename. Deleting an
    // event cascades these rows away, but SQLite has no idea the
    // filesystem exists — db/events.ts deletes the underlying files itself
    // before any delete that would cascade here.
    await db.execAsync(`
      CREATE TABLE event_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_event_photos_event_id ON event_photos(event_id);
    `);
    currentVersion = 6;
  }

  if (currentVersion === 6) {
    // Drag-to-reorder photos — an explicit
    // position rather than relying on id/insertion order, since reordering
    // means changing that order after the fact. Existing rows are
    // backfilled in their current (id) order, one event at a time, rather
    // than a single UPDATE...FROM — that syntax needs a newer SQLite than
    // this app can assume every device bundles.
    await db.execAsync('ALTER TABLE event_photos ADD COLUMN position INTEGER NOT NULL DEFAULT 0;');
    const rows = await db.getAllAsync<{ id: number; event_id: number }>(
      'SELECT id, event_id FROM event_photos ORDER BY event_id, id'
    );
    let position = 0;
    let previousEventId: number | null = null;
    for (const row of rows) {
      position = row.event_id === previousEventId ? position + 1 : 0;
      previousEventId = row.event_id;
      await db.runAsync('UPDATE event_photos SET position = ? WHERE id = ?', position, row.id);
    }
    currentVersion = 7;
  }

  await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
}
