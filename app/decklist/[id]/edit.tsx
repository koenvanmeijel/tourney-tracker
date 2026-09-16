import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { DecklistForm } from '@/components/DecklistForm';
import { Text, View } from '@/components/Themed';
import { useAppAlert } from '@/context/AppAlertContext';
import { useDecklists } from '@/context/DecklistsContext';
import type { NewDecklist } from '@/models/types';

export default function EditDecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decklists, editDecklist, removeDecklist } = useDecklists();
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

  async function handleSubmit(updated: NewDecklist) {
    await editDecklist(decklist!.id, updated);
    router.back();
  }

  async function handleDelete() {
    const confirmed = await confirm('Delete decklist?', "This can't be undone.", {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await removeDecklist(decklist!.id);
      router.replace('/decklists');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Decklist' }} />
      <DecklistForm
        initialValue={initialValue}
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
