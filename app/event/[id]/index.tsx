import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { EventBand } from '@/components/EventBand';
import { EventPhotos } from '@/components/EventPhotos';
import { PokemonIcon } from '@/components/PokemonIcon';
import { Text as ThemedText, View as ThemedView } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useAppAlert } from '@/context/AppAlertContext';
import { useEvents } from '@/context/EventsContext';
import { useTheme } from '@/context/ThemeContext';
import { tallyRounds } from '@/db/events';
import { EVENT_TYPE_LABELS, type GameResult, type RoundResult } from '@/models/types';
import { formatIsoDateForDisplay } from '@/utils/date';
import { getEventTypeTheme, getRoundResultTheme } from '@/utils/eventTheme';
import { formatDeckLabelOrNull, formatDeckTitle, formatPlacementHeadline } from '@/utils/format';

const ROUND_RESULT_SHORT: Record<RoundResult, string> = {
  win: 'W',
  loss: 'L',
  tie: 'T',
  id: 'ID',
  bye: 'BYE',
  no_show: 'NS',
};

const GAME_RESULT_SHORT: Record<GameResult, string> = { win: 'W', loss: 'L', tie: 'T' };

function roundResultLabel(result: RoundResult, games: GameResult[]): string {
  return games.length > 0 ? games.map((game) => GAME_RESULT_SHORT[game]).join('') : ROUND_RESULT_SHORT[result];
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, removeEvent } = useEvents();
  const { confirm } = useAppAlert();
  const router = useRouter();
  const { palette, themeId } = useTheme();

  const event = useMemo(() => events.find((candidate) => String(candidate.id) === id), [events, id]);

  if (!event) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.notFoundTitle}>Event not found</ThemedText>
      </ThemedView>
    );
  }

  const tally = tallyRounds(event.rounds);
  const theme = getEventTypeTheme(themeId)[event.eventType];
  const roundResultTheme = getRoundResultTheme(themeId);
  const placementHeadline = formatPlacementHeadline(event.placement, event.placementTotal);
  const record = `${tally.wins}-${tally.losses}-${tally.ties}`;
  const deckTitle = formatDeckTitle(event.deckName, event.deckPokemon);

  async function handleDelete() {
    const confirmed = await confirm('Delete event?', "This can't be undone.", {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await removeEvent(event!.id);
      router.replace('/');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: deckTitle }} />

      <View style={[styles.hero, { backgroundColor: palette.surface }]}>
        <EventBand
          eventType={event.eventType}
          deckName={event.deckName}
          deckPokemon={event.deckPokemon}
          prizeTier={event.prizeTier}
          large
        />
        <View style={[styles.heroBody, { backgroundColor: palette.surface }]}>
          <View style={styles.heroBodyLeft}>
            <Text style={[styles.eventLine, { color: palette.onSurfaceText }]}>
              {formatIsoDateForDisplay(event.date)} · {EVENT_TYPE_LABELS[event.eventType]}
            </Text>
            {event.location ? (
              <Text style={[styles.eventLine, { color: palette.onSurfaceText }]}>{event.location}</Text>
            ) : null}
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statHeadline, { color: palette.onSurfaceText }]}>
              {placementHeadline ?? record}
            </Text>
            {placementHeadline ? (
              <Text style={[styles.statRecord, { color: theme.accentText }]}>{record}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {event.rounds.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Rounds</Text>
          <View style={styles.roundsHeaderRow}>
            <Text
              style={[styles.roundsHeaderText, styles.roundNumberColumn, { color: palette.text }]}
              numberOfLines={1}>
              Round
            </Text>
            <Text style={[styles.roundsHeaderText, styles.roundsHeaderDeck, { color: palette.text }]} numberOfLines={1}>
              Deck
            </Text>
            <Text
              style={[styles.roundsHeaderText, styles.roundResultColumn, { color: palette.text }]}
              numberOfLines={1}>
              Result
            </Text>
          </View>
          <View style={styles.roundsBlock}>
            {event.rounds.map((round, index) => {
              const opponent = formatDeckLabelOrNull(round.opponentDeckName, round.opponentDeckPokemon);
              const resultTheme = roundResultTheme[round.result];
              const spriteCount = Math.min(round.opponentDeckPokemon.length, 2);
              return (
                <View
                  key={round.id}
                  style={[
                    styles.roundRow,
                    { backgroundColor: resultTheme.background },
                    index > 0 && styles.roundRowDivider,
                  ]}>
                  <Text style={[styles.roundNumberColumn, styles.roundNumberText, { color: resultTheme.text }]}>
                    {round.roundNumber}
                  </Text>
                  <View style={styles.roundDeckColumn}>
                    <View style={styles.roundSprites}>
                      {[0, 1].map((slotIndex) =>
                        slotIndex < spriteCount ? (
                          <PokemonIcon key={slotIndex} name={round.opponentDeckPokemon[slotIndex]} />
                        ) : (
                          <View key={slotIndex} style={styles.roundSpriteSpacer} />
                        )
                      )}
                    </View>
                    <Text style={[styles.roundDeckText, { color: resultTheme.text }]} numberOfLines={1}>
                      {opponent ?? 'No opponent recorded'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.roundResultColumn, styles.roundResultText, { color: resultTheme.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {roundResultLabel(round.result, round.games)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <EventPhotos eventId={event.id} photos={event.photos} />

      {event.notes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Notes</Text>
          <View style={[styles.notesBox, { backgroundColor: palette.neutralFillSubtle }]}>
            <Text style={[styles.notesText, { color: palette.onSurfaceText }]}>{event.notes}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.editButton, { backgroundColor: palette.accent }]}
          onPress={() => router.push({ pathname: '/event/[id]/edit', params: { id: String(event.id) } })}>
          <Text style={[styles.editButtonText, { color: palette.onAccentText }]}>Edit</Text>
        </Pressable>
        <Pressable style={[styles.deleteButton, { backgroundColor: palette.dangerTint }]} onPress={handleDelete}>
          <Text style={[styles.deleteButtonText, { color: palette.danger }]}>Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 48,
  },
  notFoundTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  hero: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  heroBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  heroBodyLeft: {
    flex: 1,
    gap: 3,
  },
  eventLine: {
    fontSize: 14.5,
    fontWeight: '500',
    opacity: MUTED_TEXT_OPACITY,
  },
  statBlock: {
    alignItems: 'flex-end',
  },
  statHeadline: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  statRecord: {
    fontSize: 14.5,
    fontWeight: '700',
    marginTop: 3,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
  roundsHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  roundsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
  roundsHeaderDeck: {
    flex: 1,
  },
  roundsBlock: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  roundRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.18)',
  },
  roundNumberColumn: {
    width: 42,
  },
  roundNumberText: {
    fontSize: 15,
    fontWeight: '700',
  },
  roundDeckColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundSprites: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  roundSpriteSpacer: {
    width: 40,
    height: 40,
  },
  roundDeckText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
  },
  roundResultColumn: {
    width: 58,
    textAlign: 'right',
  },
  roundResultText: {
    fontSize: 15,
    fontWeight: '700',
  },
  notesBox: {
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '700',
  },
});
