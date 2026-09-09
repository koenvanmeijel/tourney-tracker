import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  addEvents as addEventsRows,
  createEvent as createEventRow,
  deleteEvent as deleteEventRow,
  listEvents,
  replaceAllEvents,
  updateEvent as updateEventRow,
  type NewEventWithTimestamps,
} from '@/db/events';
import { addEventPhoto, removeEventPhoto, reorderEventPhotos } from '@/db/eventPhotos';
import type { EventRecord, NewEvent } from '@/models/types';
import { savePhotoFile } from '@/utils/eventPhotoStorage';

interface EventsContextValue {
  events: EventRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEvent: (input: NewEvent) => Promise<number>;
  editEvent: (id: number, input: NewEvent) => Promise<void>;
  removeEvent: (id: number) => Promise<void>;
  restoreAll: (events: NewEventWithTimestamps[]) => Promise<void>;
  addAll: (events: NewEventWithTimestamps[]) => Promise<void>;
  addPhoto: (eventId: number, sourceUri: string) => Promise<void>;
  removePhoto: (photoId: number) => Promise<void>;
  reorderPhotos: (eventId: number, photoIds: number[]) => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setEvents(await listEvents());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEvent = useCallback(
    async (input: NewEvent) => {
      const id = await createEventRow(input);
      await refresh();
      return id;
    },
    [refresh]
  );

  const editEvent = useCallback(
    async (id: number, input: NewEvent) => {
      await updateEventRow(id, input);
      await refresh();
    },
    [refresh]
  );

  const removeEvent = useCallback(
    async (id: number) => {
      await deleteEventRow(id);
      await refresh();
    },
    [refresh]
  );

  const restoreAll = useCallback(
    async (events: NewEventWithTimestamps[]) => {
      await replaceAllEvents(events);
      await refresh();
    },
    [refresh]
  );

  const addAll = useCallback(
    async (events: NewEventWithTimestamps[]) => {
      await addEventsRows(events);
      await refresh();
    },
    [refresh]
  );

  const addPhoto = useCallback(
    async (eventId: number, sourceUri: string) => {
      const filename = await savePhotoFile(sourceUri);
      await addEventPhoto(eventId, filename);
      await refresh();
    },
    [refresh]
  );

  const removePhoto = useCallback(
    async (photoId: number) => {
      await removeEventPhoto(photoId);
      await refresh();
    },
    [refresh]
  );

  const reorderPhotos = useCallback(
    async (eventId: number, photoIds: number[]) => {
      await reorderEventPhotos(eventId, photoIds);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      events,
      loading,
      error,
      refresh,
      addEvent,
      editEvent,
      removeEvent,
      restoreAll,
      addAll,
      addPhoto,
      removePhoto,
      reorderPhotos,
    }),
    [
      events,
      loading,
      error,
      refresh,
      addEvent,
      editEvent,
      removeEvent,
      restoreAll,
      addAll,
      addPhoto,
      removePhoto,
      reorderPhotos,
    ]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return ctx;
}
