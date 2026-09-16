import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  createDecklist as createDecklistRow,
  deleteDecklist as deleteDecklistRow,
  listDecklists,
  updateDecklist as updateDecklistRow,
} from '@/db/decklists';
import type { DecklistRecord, NewDecklist } from '@/models/types';

interface DecklistsContextValue {
  decklists: DecklistRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addDecklist: (input: NewDecklist) => Promise<number>;
  editDecklist: (id: number, input: NewDecklist) => Promise<void>;
  removeDecklist: (id: number) => Promise<void>;
}

const DecklistsContext = createContext<DecklistsContextValue | null>(null);

export function DecklistsProvider({ children }: { children: ReactNode }) {
  const [decklists, setDecklists] = useState<DecklistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setDecklists(await listDecklists());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decklists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDecklist = useCallback(
    async (input: NewDecklist) => {
      const id = await createDecklistRow(input);
      await refresh();
      return id;
    },
    [refresh]
  );

  const editDecklist = useCallback(
    async (id: number, input: NewDecklist) => {
      await updateDecklistRow(id, input);
      await refresh();
    },
    [refresh]
  );

  const removeDecklist = useCallback(
    async (id: number) => {
      await deleteDecklistRow(id);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({ decklists, loading, error, refresh, addDecklist, editDecklist, removeDecklist }),
    [decklists, loading, error, refresh, addDecklist, editDecklist, removeDecklist]
  );

  return <DecklistsContext.Provider value={value}>{children}</DecklistsContext.Provider>;
}

export function useDecklists(): DecklistsContextValue {
  const ctx = useContext(DecklistsContext);
  if (!ctx) {
    throw new Error('useDecklists must be used within a DecklistsProvider');
  }
  return ctx;
}
