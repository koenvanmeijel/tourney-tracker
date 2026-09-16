import { Stack, useRouter } from 'expo-router';

import { DecklistForm } from '@/components/DecklistForm';
import { useDecklists } from '@/context/DecklistsContext';
import type { NewDecklist } from '@/models/types';

export default function AddDecklistScreen() {
  const { addDecklist } = useDecklists();
  const router = useRouter();

  async function handleSubmit(decklist: NewDecklist) {
    await addDecklist(decklist);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Decklist' }} />
      <DecklistForm submitLabel="Save decklist" onSubmit={handleSubmit} />
    </>
  );
}
