import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { DecklistForm } from '@/components/DecklistForm';
import { Text, View } from '@/components/Themed';
import { useAppAlert } from '@/context/AppAlertContext';
import { useDecklists } from '@/context/DecklistsContext';
import { useEvents } from '@/context/EventsContext';
import type { NewDecklist } from '@/models/types';

export default function EditDecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decklists, editDecklist, removeDecklist } = useDecklists();
  const { events, setEventDecklist, refresh: refreshEvents } = useEvents();
  const { confirm } = useAppAlert();
  const router = useRouter();

  const decklist = useMemo(() => decklists.find((candidate) => String(candidate.id) === id), [decklists, id]);

  if (!decklist) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Decklist not found</Text>
      </View>
    );
  }

  const initialValue: NewDecklist = {
    deckName: decklist.deckName,
    pokemonNames: decklist.pokemonNames,
    decklistText: decklist.decklistText,
  };
  const initialLinkedEventIds = events.filter((event) => event.decklistId === decklist.id).map((event) => event.id);

  async function handleSubmit(updated: NewDecklist, linkedEventIds: number[]) {
    await editDecklist(decklist!.id, updated);

    const previousIds = new Set(initialLinkedEventIds);
    const nextIds = new Set(linkedEventIds);
    for (const eventId of previousIds) {
      if (!nextIds.has(eventId)) {
        await setEventDecklist(eventId, null);
      }
    }
    for (const eventId of nextIds) {
      if (!previousIds.has(eventId)) {
        await setEventDecklist(eventId, decklist!.id);
      }
    }

    router.back();
  }

  async function handleDelete() {
    const confirmed = await confirm('Delete decklist?', "This can't be undone.", {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await removeDecklist(decklist!.id);
      // The DB cascade already cleared decklist_id for any linked events —
      // refresh so the in-memory events list doesn't keep the stale id
      // (which could otherwise fail a later save with a FK error).
      await refreshEvents();
      router.replace('/decklists');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Decklist' }} />
      <DecklistForm
        initialValue={initialValue}
        linkedEventIds={initialLinkedEventIds}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
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
