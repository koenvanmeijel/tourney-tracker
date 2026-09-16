import type { DateRange } from '@/components/DateRangeDialog';
import type { EventRecord, EventType } from '@/models/types';
import { isFutureIsoDate } from '@/utils/date';

export interface DashboardFilters {
  typeFilters: EventType[];
  deckQuery: string;
  dateRange: DateRange | null;
}

export function matchesDeckQuery(event: EventRecord, query: string): boolean {
  const haystack = `${event.deckName ?? ''} ${event.deckPokemon.join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

export function filterPlayedEvents(events: EventRecord[], filters: DashboardFilters): EventRecord[] {
  const query = filters.deckQuery.trim().toLowerCase();
  return events.filter((event) => {
    if (isFutureIsoDate(event.date)) return false;
    if (filters.typeFilters.length > 0 && !filters.typeFilters.includes(event.eventType)) return false;
    if (query && !matchesDeckQuery(event, query)) return false;
    if (filters.dateRange && (event.date < filters.dateRange.from || event.date > filters.dateRange.to)) return false;
    return true;
  });
}
