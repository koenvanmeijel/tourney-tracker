import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View as RNView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';

import { Badge } from '@/components/Badge';
import { DashboardFilterBar } from '@/components/DashboardFilterBar';
import { MostPlayedRow } from '@/components/MostPlayedRow';
import { PokemonIcon } from '@/components/PokemonIcon';
import { Text, View } from '@/components/Themed';
import { ThresholdModal } from '@/components/ThresholdModal';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import { useMatchModeSettings } from '@/context/MatchModeSettingsContext';
import { useOverviewFilters } from '@/context/OverviewFiltersContext';
import { useTheme } from '@/context/ThemeContext';
import { tallyRounds } from '@/db/events';
import { filterPlayedEvents } from '@/utils/eventFilters';
import { getRoundResultTheme } from '@/utils/eventTheme';
import { formatRecordOrNull } from '@/utils/format';
import {
  bestAndWorstMatchup,
  groupOpponentRounds,
  groupPointsRate,
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

function LegendRow({ color, text }: { color: string; text: string }) {
  const { palette } = useTheme();
  return (
    <RNView style={styles.legendRow}>
      <RNView style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: palette.text }]}>{text}</Text>
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
        <Text style={[styles.matchupCaption, { color: palette.accent }]}>{title}</Text>
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

export default function DashboardScreen() {
  const { palette, themeId } = useTheme();
  const { events, loading } = useEvents();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { typeFilters, setTypeFilters, deckQuery, setDeckQuery, dateRange, setDateRange } = useOverviewFilters();
  const { matchMode, threshold, applyMatchModeSettings } = useMatchModeSettings();
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);

  function applyThresholdSettings(mode: MatchMode, value: number) {
    applyMatchModeSettings(mode, value);
    setThresholdModalOpen(false);
  }

  const filtersActive = typeFilters.length > 0 || deckQuery.trim().length > 0 || dateRange != null;

  const playedEvents = useMemo(
    () => filterPlayedEvents(events, { typeFilters, deckQuery, dateRange }),
    [events, typeFilters, deckQuery, dateRange]
  );

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
    router.push('/');
  }

  function goToMostPlayed() {
    router.push('/most-played');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: palette.text }}>Loading…</Text>
      </View>
    );
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
                <Text style={[styles.thresholdButtonText, { color: palette.accent }]}>Matchup settings</Text>
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

            <Pressable
              style={[styles.viewAllButton, { backgroundColor: palette.accentTint }]}
              onPress={goToMostPlayed}>
              <Text style={[styles.viewAllButtonText, { color: palette.accent }]}>View all</Text>
            </Pressable>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  viewAllButtonText: {
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
