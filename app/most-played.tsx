import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View as RNView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { DashboardFilterBar } from '@/components/DashboardFilterBar';
import { MostPlayedRow } from '@/components/MostPlayedRow';
import { Text, View } from '@/components/Themed';
import { ThresholdModal } from '@/components/ThresholdModal';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import { useMatchModeSettings } from '@/context/MatchModeSettingsContext';
import { useOverviewFilters } from '@/context/OverviewFiltersContext';
import { useTheme } from '@/context/ThemeContext';
import { filterPlayedEvents } from '@/utils/eventFilters';
import { getRoundResultTheme } from '@/utils/eventTheme';
import { groupOpponentRounds, topPlayedGroups, type MatchMode } from '@/utils/opponentDecks';

export default function MostPlayedScreen() {
  const { palette, themeId } = useTheme();
  const insets = useSafeAreaInsets();
  const { events, loading } = useEvents();
  const { typeFilters, setTypeFilters, deckQuery, setDeckQuery, dateRange, setDateRange } = useOverviewFilters();
  const { matchMode, threshold, applyMatchModeSettings } = useMatchModeSettings();
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);

  const filtersActive = typeFilters.length > 0 || deckQuery.trim().length > 0 || dateRange != null;

  function clearFilters() {
    setTypeFilters([]);
    setDeckQuery('');
    setDateRange(null);
  }

  function applyThresholdSettings(mode: MatchMode, value: number) {
    applyMatchModeSettings(mode, value);
    setThresholdModalOpen(false);
  }

  const playedEvents = useMemo(
    () => filterPlayedEvents(events, { typeFilters, deckQuery, dateRange }),
    [events, typeFilters, deckQuery, dateRange]
  );

  const opponentGroups = useMemo(() => groupOpponentRounds(playedEvents, matchMode), [playedEvents, matchMode]);
  const allPlayed = useMemo(() => topPlayedGroups(opponentGroups, opponentGroups.length), [opponentGroups]);

  const resultTheme = getRoundResultTheme(themeId);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Most Played' }} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: palette.text }}>Loading…</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Most Played' }} />
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
        <View style={[styles.body, { backgroundColor: palette.background }]}>
          <FlatList
            style={[styles.card, { backgroundColor: palette.surface }]}
            contentContainerStyle={[styles.cardContent, { paddingBottom: 16 + insets.bottom }]}
            data={allPlayed}
            keyExtractor={(group) => group.key}
            ListHeaderComponent={
              <RNView style={styles.headerRow}>
                <RNView style={styles.titleRow}>
                  <Text style={styles.sectionTitle}>Most played</Text>
                  <Badge text={matchMode === 'strict' ? 'STRICT' : 'RELAXED'} />
                </RNView>
                <Pressable
                  style={[styles.thresholdButton, { backgroundColor: palette.accentTint }]}
                  onPress={() => setThresholdModalOpen(true)}>
                  <Text style={[styles.thresholdButtonText, { color: palette.accent }]}>Matchup settings</Text>
                </Pressable>
              </RNView>
            }
            renderItem={({ item }) => <MostPlayedRow group={item} resultTheme={resultTheme} />}
            ItemSeparatorComponent={() => <RNView style={styles.rowSeparator} />}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
                Tag opponent decks on your rounds to see your most-played matchups.
              </Text>
            }
          />
        </View>
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
  body: {
    flex: 1,
    padding: 20,
  },
  card: {
    flex: 1,
    borderRadius: 12,
  },
  cardContent: {
    flexGrow: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
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
  rowSeparator: {
    height: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
