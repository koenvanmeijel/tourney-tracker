import type { NewEventWithTimestamps } from '@/db/events';
import type { NewMarkerWithTimestamps } from '@/db/markers';
import type { DecklistRecord, EventRecord, MarkerRecord } from '@/models/types';

function dedupeKey(date: string, eventType: string, location: string | null | undefined): string {
  return `${date}|${eventType}|${(location ?? '').trim().toLowerCase()}`;
}

function markerDedupeKey(date: string, title: string): string {
  return `${date}|${title.trim().toLowerCase()}`;
}

export function filterNewMarkers(
  imported: NewMarkerWithTimestamps[],
  existing: MarkerRecord[]
): NewMarkerWithTimestamps[] {
  const existingKeys = new Set(existing.map((marker) => markerDedupeKey(marker.date, marker.title)));
  return imported.filter((marker) => !existingKeys.has(markerDedupeKey(marker.date, marker.title)));
}

export interface DuplicateEventMatch {
  /** Index into the imported events array this match belongs to. */
  importedIndex: number;
  imported: NewEventWithTimestamps;
  /** Already-in-the-app events with the same date/event type/location. */
  existingMatches: EventRecord[];
}

function decklistDedupeKey(deckName: string, pokemonNames: string[], decklistText: string): string {
  return JSON.stringify([deckName, pokemonNames, decklistText]);
}

/** Returns an existing decklist's id when its name, Pokémon and full
 * decklist text all match exactly, so "Import & Add" can re-link the
 * imported events to it instead of inserting a byte-for-byte duplicate. */
export function findExistingDecklistId(
  decklist: { deckName: string; pokemonNames: string[]; decklistText: string },
  existing: DecklistRecord[]
): number | null {
  const key = decklistDedupeKey(decklist.deckName, decklist.pokemonNames, decklist.decklistText);
  const match = existing.find(
    (candidate) => decklistDedupeKey(candidate.deckName, candidate.pokemonNames, candidate.decklistText) === key
  );
  return match?.id ?? null;
}

export function findDuplicateEvents(
  imported: NewEventWithTimestamps[],
  existing: EventRecord[]
): DuplicateEventMatch[] {
  const existingByKey = new Map<string, EventRecord[]>();
  for (const event of existing) {
    const key = dedupeKey(event.date, event.eventType, event.location);
    const bucket = existingByKey.get(key);
    if (bucket) {
      bucket.push(event);
    } else {
      existingByKey.set(key, [event]);
    }
  }

  const duplicates: DuplicateEventMatch[] = [];
  imported.forEach((event, importedIndex) => {
    const existingMatches = existingByKey.get(dedupeKey(event.date, event.eventType, event.location));
    if (existingMatches && existingMatches.length > 0) {
      duplicates.push({ importedIndex, imported: event, existingMatches });
    }
  });
  return duplicates;
}
