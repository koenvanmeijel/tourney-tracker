import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { DateRange } from '@/components/DateRangeDialog';
import type { EventType } from '@/models/types';

interface OverviewFiltersContextValue {
  typeFilters: EventType[];
  setTypeFilters: (value: EventType[]) => void;
  deckQuery: string;
  setDeckQuery: (value: string) => void;
  dateRange: DateRange | null;
  setDateRange: (value: DateRange | null) => void;
}

const OverviewFiltersContext = createContext<OverviewFiltersContextValue | null>(null);

/**
 * Maintains filters when opening Dashboards from overview page.
 */
export function OverviewFiltersProvider({ children }: { children: ReactNode }) {
  const [typeFilters, setTypeFilters] = useState<EventType[]>([]);
  const [deckQuery, setDeckQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const value = useMemo(
    () => ({ typeFilters, setTypeFilters, deckQuery, setDeckQuery, dateRange, setDateRange }),
    [typeFilters, deckQuery, dateRange]
  );

  return <OverviewFiltersContext.Provider value={value}>{children}</OverviewFiltersContext.Provider>;
}

export function useOverviewFilters(): OverviewFiltersContextValue {
  const ctx = useContext(OverviewFiltersContext);
  if (!ctx) {
    throw new Error('useOverviewFilters must be used within an OverviewFiltersProvider');
  }
  return ctx;
}
