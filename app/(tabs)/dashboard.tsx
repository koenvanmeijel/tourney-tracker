import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View as RNView, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PieChart } from 'react-native-chart-kit';

import { DateRangeDialog, type DateRange } from '@/components/DateRangeDialog';
import { FormTextInput } from '@/components/form/FormTextInput';
import { MultiSelectChips } from '@/components/form/MultiSelectChips';
import { PokemonIcon } from '@/components/PokemonIcon';
import { Text, View } from '@/components/Themed';
import { ThresholdModal } from '@/components/ThresholdModal';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import { useTheme } from '@/context/ThemeContext';
import { tallyRounds } from '@/db/events';
import { getSetting, setSetting } from '@/db/settings';
import { EVENT_TYPES, type EventRecord, type EventType } from '@/models/types';
import { formatIsoDateForDisplay, isFutureIsoDate, toIsoDateString } from '@/utils/date';
import { getEventTypeOptions, getRoundResultTheme } from '@/utils/eventTheme';
import { formatRecordOrNull } from '@/utils/format';
import {
  bestAndWorstMatchup,
  groupOpponentRounds,
  groupPointsRate,
  groupRoundCount,
  topPlayedGroups,
  type MatchMode,
  type OpponentDeckGroup,
} from '@/utils/opponentDecks';

const PIE_MAX_SIZE = 200;
const PIE_MIN_SIZE = 120;
const SCREEN_PADDING = 20;
const TILE_PADDING = 16;
const ROW_GAP = 12;
const MOST_PLAYED_LIMIT = 3;
const DEFAULT_MATCH_MODE: MatchMode = 'strict';
const DEFAULT_THRESHOLD = 3;
// Pokémon's first release date (27 February 1996, Japan)
const DEFAULT_DATE_FROM = '1996-02-27';

const MATCH_MODE_SETTING_KEY = 'dashboardMatchMode';
const THRESHOLD_SETTING_KEY = 'dashboardThreshold';

function isMatchMode(value: string): value is MatchMode {
  return value === 'strict' || value === 'relaxed';
}

function matchesDeckQuery(event: EventRecord, query: string): boolean {
  const haystack = `${event.deckName ?? ''} ${event.deckPokemon.join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

function StatTile({
  value,
  label,
  onPress,
  compact,
}: {
  value: string | number;
  label: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  const { palette } = useTheme();
  const content = (
    <>
      <RNView style={styles.statValueRow}>
        <Text style={[styles.statValue, compact && styles.statValueCompact, { color: palette.text }]}>{value}</Text>
        {onPress ? <Text style={[styles.statLinkIcon, { color: palette.accent }]}>{'»'}</Text> : null}
      </RNView>
      <Text style={[styles.statLabel, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>{label}</Text>
    </>
  );

  const tileStyle = [styles.card, styles.statTile, compact && styles.statTileCompact, { backgroundColor: palette.surface }];

  if (!onPress) {
    return <View style={tileStyle}>{content}</View>;
  }

  return (
    <Pressable style={({ pressed }) => [...tileStyle, pressed && styles.statTilePressed]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function Badge({ text }: { text: string }) {
  const { palette } = useTheme();
  return (
    <RNView style={[styles.badge, { backgroundColor: palette.secondaryFill }]}>
      <Text style={[styles.badgeText, { color: palette.onSurfaceText }]}>{text}</Text>
    </RNView>
  );
}

function LegendRow({ color, text }: { color: string; text: string }) {
  const { palette } = useTheme();
  return (
    <RNView style={styles.legendRow}>
      <RNView style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: palette.text }]}>{text}</Text>
    </RNView>
  );
}

function MostPlayedRow({
  group,
  resultTheme,
}: {
  group: OpponentDeckGroup;
  resultTheme: ReturnType<typeof getRoundResultTheme>;
}) {
  const { palette } = useTheme();
  const record = formatRecordOrNull(group);
  const total = groupRoundCount(group);

  return (
    <RNView style={styles.playedRow}>
      <RNView style={styles.playedRowHeader}>
        <RNView style={styles.spriteRow}>
          {group.spritePokemon.map((mon, index) => (
            <PokemonIcon key={index} name={mon} size={26} />
          ))}
        </RNView>
        <Text style={[styles.playedRowLabel, { color: palette.text }]} numberOfLines={1}>
          {group.label} - {total} round{total === 1 ? '' : 's'}
          {record ? <Text style={{ color: palette.accent }}> ({record})</Text> : null}
        </Text>
      </RNView>
      <RNView style={[styles.barTrack, { backgroundColor: palette.borderSubtle }]}>
        {group.wins > 0 ? <RNView style={{ flex: group.wins, backgroundColor: resultTheme.win.background }} /> : null}
        {group.losses > 0 ? (
          <RNView style={{ flex: group.losses, backgroundColor: resultTheme.loss.background }} />
        ) : null}
        {group.ties > 0 ? <RNView style={{ flex: group.ties, backgroundColor: resultTheme.tie.background }} /> : null}
      </RNView>
    </RNView>
  );
}

function MatchupCard({ title, group }: { title: string; group: OpponentDeckGroup | null }) {
  const { palette } = useTheme();

  if (!group) {
    return (
      <RNView style={styles.matchupCol}>
        <Text style={[styles.matchupEmpty, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
          Not enough data yet
        </Text>
      </RNView>
    );
  }

  const record = formatRecordOrNull(group);
  const pointsPct = Math.round(groupPointsRate(group) * 100);

  return (
    <RNView style={styles.matchupCol}>
      <RNView style={styles.spriteRow}>
        {group.spritePokemon.map((mon, index) => (
          <PokemonIcon key={index} name={mon} size={32} />
        ))}
      </RNView>
      <Text style={[styles.matchupLabel, { color: palette.text }]} numberOfLines={2}>
        {group.label} <Text style={{ color: palette.accent }}>({pointsPct}%)</Text>
      </Text>
      {record ? (
        <Text style={[styles.matchupRecord, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>({record})</Text>
      ) : null}
      <Text style={[styles.matchupCaption, { color: palette.accent }]}>{title}</Text>
    </RNView>
  );
}

function DashboardFilterBar({
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
  const [dateDialogOpen, setDateDialogOpen] = useState(false);

  const dateLabel = dateRange
    ? `${formatIsoDateForDisplay(dateRange.from)} – ${formatIsoDateForDisplay(dateRange.to)}`
    : 'Date';

  return (
    <View style={[styles.filterBar, { borderBottomColor: palette.borderSubtle }]}>
      <RNView style={styles.searchRow}>
        <FormTextInput
          style={styles.searchInput}
          value={deckQuery}
          onChangeText={onDeckQueryChange}
          placeholder="Search by deck or Pokémon"
        />
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
        <Pressable onPress={onClear} disabled={!active} hitSlop={8}>
          <Text style={[styles.filterClear, { color: palette.accent }, !active && styles.filterClearDisabled]}>
            Clear
          </Text>
        </Pressable>
      </RNView>

      <MultiSelectChips options={typeFilterOptions} values={typeFilters} onChange={onTypeFiltersChange} />

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
    </View>
  );
}

export default function DashboardScreen() {
  const { palette, themeId } = useTheme();
  const { events } = useEvents();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [typeFilters, setTypeFilters] = useState<EventType[]>([]);
  const [deckQuery, setDeckQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [matchMode, setMatchMode] = useState<MatchMode>(DEFAULT_MATCH_MODE);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSetting(MATCH_MODE_SETTING_KEY), getSetting(THRESHOLD_SETTING_KEY)])
      .then(([storedMode, storedThreshold]) => {
        if (cancelled) return;
        if (storedMode && isMatchMode(storedMode)) {
          setMatchMode(storedMode);
        }
        if (storedThreshold) {
          const parsed = Number.parseInt(storedThreshold, 10);
          if (Number.isFinite(parsed) && parsed >= 1) {
            setThreshold(parsed);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function applyThresholdSettings(mode: MatchMode, value: number) {
    setMatchMode(mode);
    setThreshold(value);
    setThresholdModalOpen(false);
    setSetting(MATCH_MODE_SETTING_KEY, mode).catch(() => {});
    setSetting(THRESHOLD_SETTING_KEY, String(value)).catch(() => {});
  }

  const filterParams = useLocalSearchParams<{ types?: string; deck?: string; from?: string; to?: string }>();
  useEffect(() => {
    if (
      filterParams.types === undefined &&
      filterParams.deck === undefined &&
      filterParams.from === undefined &&
      filterParams.to === undefined
    ) {
      return;
    }
    const types = filterParams.types
      ? filterParams.types
          .split(',')
          .filter((value): value is EventType => (EVENT_TYPES as string[]).includes(value))
      : [];
    setTypeFilters(types);
    setDeckQuery(filterParams.deck ?? '');
    setDateRange(filterParams.from && filterParams.to ? { from: filterParams.from, to: filterParams.to } : null);
  }, [filterParams.types, filterParams.deck, filterParams.from, filterParams.to]);

  const filtersActive = typeFilters.length > 0 || deckQuery.trim().length > 0 || dateRange != null;

  const playedEvents = useMemo(() => {
    const query = deckQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (isFutureIsoDate(event.date)) return false;
      if (typeFilters.length > 0 && !typeFilters.includes(event.eventType)) return false;
      if (query && !matchesDeckQuery(event, query)) return false;
      if (dateRange && (event.date < dateRange.from || event.date > dateRange.to)) return false;
      return true;
    });
  }, [events, typeFilters, deckQuery, dateRange]);

  const totalTournaments = playedEvents.length;

  const totalRounds = useMemo(
    () => playedEvents.reduce((sum, event) => sum + event.rounds.length, 0),
    [playedEvents]
  );

  const prizingRate = useMemo(() => {
    if (totalTournaments === 0) return 0;
    const prized = playedEvents.filter((event) => event.prizeTier !== 'none').length;
    return Math.round((prized / totalTournaments) * 100);
  }, [playedEvents, totalTournaments]);

  const tally = useMemo(
    () =>
      playedEvents.reduce(
        (acc, event) => {
          const eventTally = tallyRounds(event.rounds);
          acc.wins += eventTally.wins;
          acc.losses += eventTally.losses;
          acc.ties += eventTally.ties;
          return acc;
        },
        { wins: 0, losses: 0, ties: 0 }
      ),
    [playedEvents]
  );

  const decisiveRounds = tally.wins + tally.losses + tally.ties;

  const resultTheme = getRoundResultTheme(themeId);
  const chartSlices = useMemo(
    () => [
      { label: 'wins', count: tally.wins, color: resultTheme.win.background },
      { label: 'losses', count: tally.losses, color: resultTheme.loss.background },
      { label: 'ties', count: tally.ties, color: resultTheme.tie.background },
    ].filter((slice) => slice.count > 0),
    [tally, resultTheme]
  );

  const opponentGroups = useMemo(() => groupOpponentRounds(playedEvents, matchMode), [playedEvents, matchMode]);
  const mostPlayed = useMemo(() => topPlayedGroups(opponentGroups, MOST_PLAYED_LIMIT), [opponentGroups]);
  const matchups = useMemo(() => bestAndWorstMatchup(opponentGroups, threshold), [opponentGroups, threshold]);

  const topRowContentWidth = width - SCREEN_PADDING * 2 - ROW_GAP;
  const chartCardWidth = (topRowContentWidth * 3) / 5;
  const pieSize = Math.max(PIE_MIN_SIZE, Math.min(PIE_MAX_SIZE, chartCardWidth - TILE_PADDING * 2));

  function clearFilters() {
    setTypeFilters([]);
    setDeckQuery('');
    setDateRange(null);
  }

  function goToFilteredOverview() {
    router.push({
      pathname: '/',
      params: {
        types: typeFilters.join(','),
        deck: deckQuery,
        from: dateRange?.from ?? '',
        to: dateRange?.to ?? '',
      },
    });
  }

  return (
    <>
      <View style={styles.screen}>
        <DashboardFilterBar
          typeFilters={typeFilters}
          onTypeFiltersChange={setTypeFilters}
          deckQuery={deckQuery}
          onDeckQueryChange={setDeckQuery}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onClear={clearFilters}
          active={filtersActive}
        />
        <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
          <RNView style={styles.topRow}>
            <RNView style={styles.leftCol}>
              <StatTile
                value={totalTournaments}
                label={`tournament${totalTournaments === 1 ? '' : 's'} played`}
                onPress={goToFilteredOverview}
              />
              <StatTile value={totalRounds} label={`round${totalRounds === 1 ? '' : 's'} played`} />
              <StatTile value={`${prizingRate}%`} label="prizing rate" compact />
            </RNView>

            <View style={[styles.card, styles.chartCard, { backgroundColor: palette.surface }]}>
              <Text style={styles.sectionTitle}>Win / Loss / Tie rate</Text>
              {decisiveRounds > 0 ? (
                <>
                  <PieChart
                    data={chartSlices.map((slice) => ({
                      name: slice.label,
                      count: slice.count,
                      color: slice.color,
                      legendFontColor: palette.text,
                      legendFontSize: 12,
                    }))}
                    width={pieSize}
                    height={pieSize}
                    accessor="count"
                    backgroundColor="transparent"
                    paddingLeft={String(pieSize / 4)}
                    hasLegend={false}
                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                  />
                  <RNView style={styles.legendList}>
                    {chartSlices.map((slice) => (
                      <LegendRow
                        key={slice.label}
                        color={slice.color}
                        text={`${Math.round((slice.count / decisiveRounds) * 100)}% ${slice.label} (${slice.count})`}
                      />
                    ))}
                  </RNView>
                </>
              ) : (
                <Text style={[styles.emptyText, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
                  {filtersActive
                    ? 'No matching results for this filter.'
                    : 'Log some round results to see your win/loss/tie rate.'}
                </Text>
              )}
            </View>
          </RNView>

          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            <RNView style={styles.opponentHeaderRow}>
              <RNView style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Most played</Text>
                <Badge text={matchMode === 'strict' ? 'STRICT' : 'RELAXED'} />
              </RNView>
              <Pressable
                style={[styles.thresholdButton, { backgroundColor: palette.accentTint }]}
                onPress={() => setThresholdModalOpen(true)}>
                <Text style={[styles.thresholdButtonText, { color: palette.accent }]}>Set threshold</Text>
              </Pressable>
            </RNView>

            {mostPlayed.length === 0 ? (
              <Text style={[styles.emptyText, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
                Tag opponent decks on your rounds to see your most-played matchups.
              </Text>
            ) : (
              <RNView style={styles.playedList}>
                {mostPlayed.map((group) => (
                  <MostPlayedRow key={group.key} group={group} resultTheme={resultTheme} />
                ))}
              </RNView>
            )}

            <RNView style={[styles.sectionTitleRow, styles.matchupsTitle]}>
              <Text style={styles.sectionTitle}>Matchups</Text>
              <Badge text={`MIN. ${threshold}`} />
            </RNView>
            <RNView style={styles.matchupRow}>
              <MatchupCard title="BEST" group={matchups.best} />
              <MatchupCard title="WORST" group={matchups.worst} />
            </RNView>
          </View>
        </ScrollView>
      </View>

      <ThresholdModal
        visible={thresholdModalOpen}
        matchMode={matchMode}
        threshold={threshold}
        onApply={applyThresholdSettings}
        onClose={() => setThresholdModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  filterBar: {
    padding: 16,
    paddingBottom: 12,
    gap: 10,
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
  dateButton: {
    flexDirection: 'row',
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
  filterClear: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterClearDisabled: {
    opacity: MUTED_TEXT_OPACITY,
  },
  container: {
    padding: SCREEN_PADDING,
    gap: 32,
  },
  card: {
    borderRadius: 12,
    padding: TILE_PADDING,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    gap: ROW_GAP,
    alignItems: 'stretch',
  },
  leftCol: {
    flex: 2,
    gap: ROW_GAP,
  },
  chartCard: {
    flex: 3,
    alignItems: 'center',
  },
  statTile: {
    gap: 4,
  },
  statTileCompact: {
    padding: 12,
    gap: 2,
  },
  statTilePressed: {
    opacity: 0.85,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 48,
    lineHeight: 48,
    fontFamily: 'SpaceMono',
  },
  statValueCompact: {
    fontSize: 28,
    lineHeight: 28,
  },
  statLinkIcon: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 48,
  },
  statLabel: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  legendList: {
    alignSelf: 'center',
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
  },
  opponentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thresholdButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  thresholdButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  playedList: {
    gap: 16,
  },
  playedRow: {
    gap: 6,
  },
  playedRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playedRowLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
  },
  barTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  matchupsTitle: {
    marginTop: 8,
  },
  matchupRow: {
    flexDirection: 'row',
    gap: 16,
  },
  matchupCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  matchupLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  matchupRecord: {
    fontSize: 13,
  },
  matchupCaption: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  matchupEmpty: {
    fontSize: 13,
    textAlign: 'center',
  },
});
