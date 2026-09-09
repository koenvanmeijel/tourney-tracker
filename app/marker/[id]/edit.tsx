import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { MarkerForm } from '@/components/MarkerForm';
import { Text, View } from '@/components/Themed';
import { useAppAlert } from '@/context/AppAlertContext';
import { useMarkers } from '@/context/MarkersContext';
import type { NewMarker } from '@/models/types';

export default function EditMarkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { markers, editMarker, removeMarker } = useMarkers();
  const { confirm } = useAppAlert();
  const router = useRouter();

  const marker = useMemo(() => markers.find((candidate) => String(candidate.id) === id), [markers, id]);

  if (!marker) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Marker not found</Text>
      </View>
    );
  }

  const initialValue: NewMarker = {
    date: marker.date,
    title: marker.title,
    note: marker.note,
    color: marker.color,
  };

  async function handleSubmit(updated: NewMarker) {
    await editMarker(marker!.id, updated);
    router.back();
  }

  async function handleDelete() {
    const confirmed = await confirm('Delete marker?', "This can't be undone.", {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await removeMarker(marker!.id);
      router.replace('/');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Marker' }} />
      <MarkerForm initialValue={initialValue} submitLabel="Save changes" onSubmit={handleSubmit} onDelete={handleDelete} />
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
