import { Stack, useRouter } from 'expo-router';

import { DecklistForm } from '@/components/DecklistForm';
import { useDecklists } from '@/context/DecklistsContext';
import { useEvents } from '@/context/EventsContext';
import type { NewDecklist } from '@/models/types';

export default function AddDecklistScreen() {
  const { addDecklist } = useDecklists();
  const { setEventDecklist } = useEvents();
  const router = useRouter();

  async function handleSubmit(decklist: NewDecklist, linkedEventIds: number[]) {
    const id = await addDecklist(decklist);
    for (const eventId of linkedEventIds) {
      await setEventDecklist(eventId, id);
    }
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Decklist' }} />
      <DecklistForm submitLabel="Save decklist" onSubmit={handleSubmit} />
    </>
  );
}
