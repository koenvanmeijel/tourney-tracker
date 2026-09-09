import { useState } from 'react';
import { useRouter } from 'expo-router';

import { EventForm } from '@/components/EventForm';
import { useEvents } from '@/context/EventsContext';
import type { NewEvent } from '@/models/types';

export default function AddEventScreen() {
  const { addEvent } = useEvents();
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: NewEvent) {
    const id = await addEvent(event);
    setFormKey((key) => key + 1);
    router.navigate('/');
    router.push({ pathname: '/event/[id]', params: { id: String(id) } });
  }

  return (
    <EventForm
      key={formKey}
      submitLabel="Save event"
      onSubmit={handleSubmit}
      onAddMarker={() => router.push('/marker/add')}
    />
  );
}
