import { Stack, useRouter } from 'expo-router';

import { MarkerForm } from '@/components/MarkerForm';
import { useMarkers } from '@/context/MarkersContext';
import type { NewMarker } from '@/models/types';

export default function AddMarkerScreen() {
  const { addMarker } = useMarkers();
  const router = useRouter();

  async function handleSubmit(marker: NewMarker) {
    await addMarker(marker);
    router.navigate('/');
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Marker' }} />
      <MarkerForm submitLabel="Save marker" onSubmit={handleSubmit} />
    </>
  );
}
