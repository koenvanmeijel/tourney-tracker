import type { NewEventWithTimestamps } from '@/db/events';
import type { EventRecord } from '@/models/types';

function dedupeKey(date: string, eventType: string, location: string | null | undefined): string {
  return `${date}|${eventType}|${(location ?? '').trim().toLowerCase()}`;
}

export interface DuplicateEventMatch {
  /** Index into the imported events array this match belongs to. */
  importedIndex: number;
  imported: NewEventWithTimestamps;
  /** Already-in-the-app events with the same date/event type/location. */
  existingMatches: EventRecord[];
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
