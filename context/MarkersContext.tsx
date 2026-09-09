import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  addMarkers as addMarkersRows,
  createMarker as createMarkerRow,
  deleteMarker as deleteMarkerRow,
  listMarkers,
  replaceAllMarkers,
  updateMarker as updateMarkerRow,
  type NewMarkerWithTimestamps,
} from '@/db/markers';
import type { MarkerRecord, NewMarker } from '@/models/types';

interface MarkersContextValue {
  markers: MarkerRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addMarker: (input: NewMarker) => Promise<number>;
  editMarker: (id: number, input: NewMarker) => Promise<void>;
  removeMarker: (id: number) => Promise<void>;
  restoreAll: (markers: NewMarkerWithTimestamps[]) => Promise<void>;
  addAll: (markers: NewMarkerWithTimestamps[]) => Promise<void>;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

export function MarkersProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState<MarkerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setMarkers(await listMarkers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMarker = useCallback(
    async (input: NewMarker) => {
      const id = await createMarkerRow(input);
      await refresh();
      return id;
    },
    [refresh]
  );

  const editMarker = useCallback(
    async (id: number, input: NewMarker) => {
      await updateMarkerRow(id, input);
      await refresh();
    },
    [refresh]
  );

  const removeMarker = useCallback(
    async (id: number) => {
      await deleteMarkerRow(id);
      await refresh();
    },
    [refresh]
  );

  const restoreAll = useCallback(
    async (markersToRestore: NewMarkerWithTimestamps[]) => {
      await replaceAllMarkers(markersToRestore);
      await refresh();
    },
    [refresh]
  );

  const addAll = useCallback(
    async (markersToAdd: NewMarkerWithTimestamps[]) => {
      await addMarkersRows(markersToAdd);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({ markers, loading, error, refresh, addMarker, editMarker, removeMarker, restoreAll, addAll }),
    [markers, loading, error, refresh, addMarker, editMarker, removeMarker, restoreAll, addAll]
  );

  return <MarkersContext.Provider value={value}>{children}</MarkersContext.Provider>;
}

export function useMarkers(): MarkersContextValue {
  const ctx = useContext(MarkersContext);
  if (!ctx) {
    throw new Error('useMarkers must be used within a MarkersProvider');
  }
  return ctx;
}
