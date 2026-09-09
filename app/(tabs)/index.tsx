import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { DateRangeDialog, type DateRange } from '@/components/DateRangeDialog';
import { EventBand } from '@/components/EventBand';
import { FormTextInput } from '@/components/form/FormTextInput';
import { MultiSelectChips } from '@/components/form/MultiSelectChips';
import { View as ThemedView } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import { useMarkers } from '@/context/MarkersContext';
import { useTheme } from '@/context/ThemeContext';
import { tallyRounds } from '@/db/events';
import { EVENT_TYPE_LABELS, type EventRecord, type EventType, type MarkerRecord } from '@/models/types';
import { formatIsoDateForDisplay, toIsoDateString } from '@/utils/date';
import { getEventTypeOptions, getEventTypeTheme } from '@/utils/eventTheme';
import { photoFileUri } from '@/utils/eventPhotoStorage';
import { formatPlacementHeadline } from '@/utils/format';
import { getMarkerOnColor } from '@/utils/markerColors';

// Pokémon's first release date (27 February 1996, Japan)
const DEFAULT_DATE_FROM = '1996-02-27';

function matchesDeckQuery(event: EventRecord, query: string): boolean {
  const haystack = `${event.deckName ?? ''} ${event.deckPokemon.join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

function EventRow({ event }: { event: EventRecord }) {
  const router = useRouter();
  const { palette, themeId } = useTheme();
  const tally = tallyRounds(event.rounds);
  const theme = getEventTypeTheme(themeId)[event.eventType];
  const placementHeadline = formatPlacementHeadline(event.placement, event.placementTotal);
  const record = `${tally.wins}-${tally.losses}-${tally.ties}`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.surface },
        pressed && styles.cardPressed,
      ]}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: String(event.id) } })}>
      <EventBand
        eventType={event.eventType}
        deckName={event.deckName}
        deckPokemon={event.deckPokemon}
        prizeTier={event.prizeTier}
      />
      <View style={[styles.cardBody, { backgroundColor: palette.surface }]}>
        <View style={styles.cardBodyLeft}>
          <Text style={[styles.eventLine, { color: palette.onSurfaceText }]}>
            {formatIsoDateForDisplay(event.date)} · {EVENT_TYPE_LABELS[event.eventType]}
          </Text>
          {event.location ? (
            <Text style={[styles.eventLine, { color: palette.onSurfaceText }]}>{event.location}</Text>
          ) : null}
        </View>
        {event.photos.length > 0 ? (
          <View style={styles.thumbnailWrap}>
            <Image source={{ uri: photoFileUri(event.photos[0].filename) }} style={styles.thumbnail} />
            {event.photos.length > 1 ? (
              <View style={[styles.thumbnailBadge, { backgroundColor: palette.surface }]}>
                <Text style={[styles.thumbnailBadgeText, { color: palette.onSurfaceText }]}>
                  +{event.photos.length - 1}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.statBlock}>
          <Text style={[styles.statHeadline, { color: palette.onSurfaceText }]}>
            {placementHeadline ?? record}
          </Text>
          {placementHeadline ? (
            <Text style={[styles.statRecord, { color: theme.accentText }]}>{record}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function MarkerRow({ marker }: { marker: MarkerRecord }) {
  const router = useRouter();
  const { palette } = useTheme();
  const onColor = getMarkerOnColor(marker.color);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/marker/[id]/edit', params: { id: String(marker.id) } })}>
      <View style={[styles.markerBar, { backgroundColor: marker.color }]}>
        <Text style={[styles.markerTitle, { color: onColor }]} numberOfLines={1}>
          {marker.title}
        </Text>
        <Text style={[styles.markerDate, { color: onColor }]}>{formatIsoDateForDisplay(marker.date)}</Text>
      </View>
      {marker.note ? (
        <View style={[styles.markerNoteBox, { backgroundColor: palette.surface }]}>
          <Text style={[styles.markerNoteText, { color: palette.onSurfaceText }]}>{marker.note}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FilterBar({
  typeFilters,
  onTypeFiltersChange,
  deckQuery,
  onDeckQueryChange,
  dateRange,
  onDateRangeChange,
  onClear,
  active,
}: {
  typeFilters: EventType[];
  onTypeFiltersChange: (value: EventType[]) => void;
  deckQuery: string;
  onDeckQueryChange: (value: string) => void;
  dateRange: DateRange | null;
  onDateRangeChange: (value: DateRange | null) => void;
  onClear: () => void;
  active: boolean;
}) {
  const { palette, themeId } = useTheme();
  const typeFilterOptions = useMemo(() => getEventTypeOptions(themeId), [themeId]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);

  const dateLabel = dateRange
    ? `${formatIsoDateForDisplay(dateRange.from)} – ${formatIsoDateForDisplay(dateRange.to)}`
    : 'Date';

  return (
    <ThemedView style={[styles.filterBar, { borderBottomColor: palette.borderSubtle }]}>
      <View style={styles.searchRow}>
        <FormTextInput
          style={styles.searchInput}
          value={deckQuery}
          onChangeText={onDeckQueryChange}
          placeholder="Search by deck or Pokémon"
        />
        {}
        <Pressable
          style={[
            styles.filtersToggle,
            { backgroundColor: palette.surface, borderColor: palette.border },
            active && { backgroundColor: palette.accent, borderColor: palette.accent },
          ]}
          onPress={() => setFiltersOpen((open) => !open)}>
          <SymbolView
            name={{ android: 'tune' }}
            tintColor={active ? palette.onAccentText : palette.accent}
            size={18}
          />
          <Text
            style={[
              styles.filtersToggleText,
              { color: palette.accent },
              active && { color: palette.onAccentText },
            ]}>
            Filters
          </Text>
          <SymbolView
            name={{ android: filtersOpen ? 'expand_less' : 'expand_more' }}
            tintColor={active ? palette.onAccentText : palette.accent}
            size={18}
          />
        </Pressable>
      </View>

      {filtersOpen ? (
        <View style={styles.expandedFilters}>
          <View style={styles.filterHeaderRow}>
            <Text style={[styles.filterLabel, { color: palette.text }]}>Event type</Text>
            {}
            <Pressable onPress={onClear} disabled={!active} style={!active && styles.filterClearHidden}>
              <Text style={[styles.filterClear, { color: palette.accent }]}>Clear all</Text>
            </Pressable>
          </View>
          <MultiSelectChips options={typeFilterOptions} values={typeFilters} onChange={onTypeFiltersChange} />
          <Pressable
            style={[
              styles.dateButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
              dateRange && { backgroundColor: palette.accent, borderColor: palette.accent },
            ]}
            onPress={() => setDateDialogOpen(true)}>
            <SymbolView
              name={{ android: 'calendar_today' }}
              tintColor={dateRange ? palette.onAccentText : palette.accent}
              size={16}
            />
            <Text
              style={[
                styles.dateButtonText,
                { color: palette.accent },
                dateRange && { color: palette.onAccentText },
              ]}>
              {dateLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <DateRangeDialog
        visible={dateDialogOpen}
        from={dateRange?.from ?? DEFAULT_DATE_FROM}
        to={dateRange?.to ?? toIsoDateString(new Date())}
        hasActiveRange={dateRange != null}
        onApply={(from, to) => {
          onDateRangeChange({ from, to });
          setDateDialogOpen(false);
        }}
        onClear={() => {
          onDateRangeChange(null);
          setDateDialogOpen(false);
        }}
        onClose={() => setDateDialogOpen(false)}
      />
    </ThemedView>
  );
}

type FeedItem =
  | { kind: 'event'; key: string; date: string; event: EventRecord }
  | { kind: 'marker'; key: string; date: string; marker: MarkerRecord };

export default function EventsScreen() {
  const { palette } = useTheme();
  const { events, loading: eventsLoading, error: eventsError } = useEvents();
  const { markers, loading: markersLoading, error: markersError } = useMarkers();
  const [typeFilters, setTypeFilters] = useState<EventType[]>([]);
  const [deckQuery, setDeckQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const loading = eventsLoading || markersLoading;
  const error = eventsError ?? markersError;
  const filtersActive = typeFilters.length > 0 || deckQuery.trim().length > 0 || dateRange != null;

  const filteredEvents = useMemo(() => {
    const query = deckQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (typeFilters.length > 0 && !typeFilters.includes(event.eventType)) return false;
      if (query && !matchesDeckQuery(event, query)) return false;
      if (dateRange && (event.date < dateRange.from || event.date > dateRange.to)) return false;
      return true;
    });
  }, [events, typeFilters, deckQuery, dateRange]);

  const excludesMarkers = typeFilters.length > 0 || deckQuery.trim().length > 0;
  const filteredMarkers = useMemo(() => {
    if (!dateRange) return markers;
    return markers.filter((marker) => marker.date >= dateRange.from && marker.date <= dateRange.to);
  }, [markers, dateRange]);

  const feedItems = useMemo<FeedItem[]>(() => {
    const eventItems: FeedItem[] = filteredEvents.map((event) => ({
      kind: 'event',
      key: `event-${event.id}`,
      date: event.date,
      event,
    }));
    if (excludesMarkers) {
      return eventItems;
    }
    const markerItems: FeedItem[] = filteredMarkers.map((marker) => ({
      kind: 'marker',
      key: `marker-${marker.id}`,
      date: marker.date,
      marker,
    }));
    return [...eventItems, ...markerItems].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [filteredEvents, filteredMarkers, excludesMarkers]);

  function clearFilters() {
    setTypeFilters([]);
    setDeckQuery('');
    setDateRange(null);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Text style={{ color: palette.text }}>Loading…</Text>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Text style={[styles.title, { color: palette.text }]}>Couldn&apos;t load events</Text>
        <Text style={[styles.subtitle, { color: palette.text }]}>{error}</Text>
      </ThemedView>
    );
  }

  if (events.length === 0 && markers.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Text style={[styles.title, { color: palette.text }]}>No events yet</Text>
        <Text style={[styles.subtitle, { color: palette.text }]}>
          Log your first tournament from the Add Event tab.
        </Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <FilterBar
        typeFilters={typeFilters}
        onTypeFiltersChange={setTypeFilters}
        deckQuery={deckQuery}
        onDeckQueryChange={setDeckQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClear={clearFilters}
        active={filtersActive}
      />
      {feedItems.length === 0 ? (
        <ThemedView style={styles.container}>
          <Text style={[styles.title, { color: palette.text }]}>No matching events</Text>
          <Text style={[styles.subtitle, { color: palette.text }]}>Try a different filter.</Text>
        </ThemedView>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={feedItems}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (item.kind === 'event' ? <EventRow event={item.event} /> : <MarkerRow marker={item.marker} />)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  filterBar: {
    padding: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filtersToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedFilters: {
    gap: 10,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
  filterClear: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterClearHidden: {
    opacity: 0,
  },
  dateButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    textAlign: 'center',
    opacity: MUTED_TEXT_OPACITY,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardBodyLeft: {
    flex: 1,
    gap: 2,
  },
  eventLine: {
    fontSize: 13.5,
    fontWeight: '500',
    opacity: MUTED_TEXT_OPACITY,
  },
  thumbnailWrap: {
    width: 44,
    height: 44,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  thumbnailBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statBlock: {
    alignItems: 'flex-end',
  },
  statHeadline: {
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 24,
  },
  statRecord: {
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 2,
  },
  markerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  markerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  markerDate: {
    fontSize: 12,
    opacity: MUTED_TEXT_OPACITY,
  },
  markerNoteBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  markerNoteText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
