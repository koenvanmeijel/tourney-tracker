import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { EventForm } from '@/components/EventForm';
import { Text, View } from '@/components/Themed';
import { useEvents } from '@/context/EventsContext';
import type { NewEvent } from '@/models/types';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, editEvent } = useEvents();
  const router = useRouter();

  const event = useMemo(() => events.find((candidate) => String(candidate.id) === id), [events, id]);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Event not found</Text>
      </View>
    );
  }

  const initialValue: NewEvent = {
    date: event.date,
    eventType: event.eventType,
    location: event.location,
    deckName: event.deckName,
    deckPokemon: event.deckPokemon,
    placement: event.placement,
    placementTotal: event.placementTotal,
    prizeTier: event.prizeTier,
    notes: event.notes,
    rounds: event.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      result: round.result,
      games: round.games,
      opponentDeckName: round.opponentDeckName,
      opponentDeckPokemon: round.opponentDeckPokemon,
    })),
  };

  async function handleSubmit(updated: NewEvent) {
    await editEvent(event!.id, updated);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Event' }} />
      <EventForm initialValue={initialValue} submitLabel="Save changes" onSubmit={handleSubmit} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
  },
});
