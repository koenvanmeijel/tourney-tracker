import { EVENT_TYPES, type EventType } from '@/models/types';
import { slugify } from '@/utils/slug';

/**
 * The "export logs + photos" filename convention:
 *   {yyyy}-{mm}-{dd}-{eventType}[-{location-slug}]-{index}.{ext}
 * e.g. "2025-01-05-challenge-outpost-1.jpg", index 1 always the thumbnail.
 */
export interface PhotoZipKey {
  date: string; // yyyy-mm-dd
  eventType: EventType;
  locationSlug: string; // '' when the event has no location
}

export interface PhotoZipEntryKey extends PhotoZipKey {
  index: number; // 1-based; 1 is always the thumbnail
}

export function photoZipKeyId(key: PhotoZipKey): string {
  return `${key.date}|${key.eventType}|${key.locationSlug}`;
}

export function eventPhotoZipKey(date: string, eventType: EventType, location: string | null): PhotoZipKey {
  return { date, eventType, locationSlug: location ? slugify(location) : '' };
}

export function buildPhotoZipEntryName(key: PhotoZipEntryKey, extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const locationPart = key.locationSlug ? `-${key.locationSlug}` : '';
  return `${key.date}-${key.eventType}${locationPart}-${key.index}${ext}`;
}

export interface ParsedPhotoZipEntryName extends PhotoZipEntryKey {
  extension: string;
}

export function parsePhotoZipEntryName(filename: string): ParsedPhotoZipEntryName | null {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0 || dot === filename.length - 1) {
    return null;
  }
  const base = filename.slice(0, dot);
  const extension = filename.slice(dot);

  const tokens = base.split('-').filter((token) => token.length > 0);
  if (tokens.length < 5) {
    return null; // yyyy, mm, dd, eventType, index is the minimum
  }

  const [yyyy, mm, dd, eventTypeToken, ...rest] = tokens;
  if (!/^\d{4}$/.test(yyyy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) {
    return null;
  }
  if (!(EVENT_TYPES as string[]).includes(eventTypeToken)) {
    return null;
  }

  const indexToken = rest[rest.length - 1];
  if (!/^\d+$/.test(indexToken)) {
    return null;
  }

  return {
    date: `${yyyy}-${mm}-${dd}`,
    eventType: eventTypeToken as EventType,
    locationSlug: rest.slice(0, -1).join('-'),
    index: Number(indexToken),
    extension,
  };
}

export function groupByPhotoZipKey<T>(items: T[], keyOf: (item: T) => PhotoZipKey | null): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const id = photoZipKeyId(key);
    const existing = groups.get(id);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(id, [item]);
    }
  }
  return groups;
}

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif']);
