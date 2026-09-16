import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { DuplicateDecklistModal } from '@/components/DuplicateDecklistModal';
import { PokemonIcon } from '@/components/PokemonIcon';
import { Text, View } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useAppAlert } from '@/context/AppAlertContext';
import { useDecklists } from '@/context/DecklistsContext';
import { useEvents } from '@/context/EventsContext';
import { useTheme } from '@/context/ThemeContext';
import { tallyRounds } from '@/db/events';
import { EVENT_TYPE_LABELS, type EventRecord } from '@/models/types';
import { daysUntilIsoDate, formatIsoDateForDisplay, formatIsoTimestampForDisplay, isFutureIsoDate } from '@/utils/date';
import { getEventTypeTheme } from '@/utils/eventTheme';
import { photoFileUri } from '@/utils/eventPhotoStorage';
import { formatDaysUntil, formatPlacementHeadline, formatRecordOrNull } from '@/utils/format';

function DuplicateButton({ onPress }: { onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.headerButton} hitSlop={8}>
      <SymbolView
        name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
        tintColor={palette.text}
        size={22}
      />
    </Pressable>
  );
}

function LinkedEventRow({ event }: { event: EventRecord }) {
  const router = useRouter();
  const { themeId } = useTheme();
  const theme = getEventTypeTheme(themeId)[event.eventType];
  const tally = tallyRounds(event.rounds);
  const isUpcoming = isFutureIsoDate(event.date);
  const placementHeadline = formatPlacementHeadline(event.placement, event.placementTotal);
  const record = formatRecordOrNull(tally);

  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, { backgroundColor: theme.band }, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: String(event.id) } })}>
      <RNView style={styles.eventCardLeft}>
        <Text style={[styles.eventCardLine, { color: theme.onBand }]}>
          {formatIsoDateForDisplay(event.date)} · {EVENT_TYPE_LABELS[event.eventType]}
        </Text>
        {event.location ? <Text style={[styles.eventCardLine, { color: theme.onBand }]}>{event.location}</Text> : null}
      </RNView>
      {event.photos.length > 0 ? (
        <RNView style={styles.eventCardThumbnailWrap}>
          <Image
            source={{
              uri: photoFileUri((event.photos.find((photo) => photo.isThumbnail) ?? event.photos[0]).filename),
            }}
            style={styles.eventCardThumbnail}
          />
          {event.photos.length > 1 ? (
            <RNView style={[styles.eventCardThumbnailBadge, { backgroundColor: theme.band }]}>
              <Text style={[styles.eventCardThumbnailBadgeText, { color: theme.onBand }]}>
                +{event.photos.length - 1}
              </Text>
            </RNView>
          ) : null}
        </RNView>
      ) : null}
      {isUpcoming ? (
        <RNView style={styles.eventCardStat}>
          <Text style={[styles.eventCardStatHeadline, { color: theme.onBand }]}>
            {formatDaysUntil(daysUntilIsoDate(event.date))}
          </Text>
        </RNView>
      ) : placementHeadline || record ? (
        <RNView style={styles.eventCardStat}>
          <Text style={[styles.eventCardStatHeadline, { color: theme.onBand }]}>{placementHeadline ?? record}</Text>
          {placementHeadline && record ? (
            <Text style={[styles.eventCardStatRecord, { color: theme.onBand }]}>{record}</Text>
          ) : null}
        </RNView>
      ) : null}
    </Pressable>
  );
}

export default function DecklistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decklists, addDecklist, removeDecklist } = useDecklists();
  const { events, refresh: refreshEvents } = useEvents();
  const { palette } = useTheme();
  const { confirm } = useAppAlert();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);

  const decklist = useMemo(() => decklists.find((candidate) => String(candidate.id) === id), [decklists, id]);

  if (!decklist) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFoundTitle}>Decklist not found</Text>
      </View>
    );
  }

  const linkedEvents = events.filter((event) => event.decklistId === decklist.id);

  async function handleCopy() {
    await Clipboard.setStringAsync(decklist!.decklistText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDuplicateConfirm(name: string) {
    setDuplicateModalVisible(false);
    const newId = await addDecklist({
      deckName: name,
      pokemonNames: decklist!.pokemonNames,
      decklistText: decklist!.decklistText,
    });
    router.push({ pathname: '/decklist/[id]', params: { id: String(newId) } });
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
      <Stack.Screen
        options={{ title: decklist.deckName, headerRight: () => <DuplicateButton onPress={() => setDuplicateModalVisible(true)} /> }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.hero, { backgroundColor: palette.surface }]}>
          <Text style={[styles.deckName, { color: palette.onSurfaceText }]}>{decklist.deckName}</Text>
          {decklist.pokemonNames.length > 0 ? (
            <>
              <RNView style={styles.spritesRow}>
                {decklist.pokemonNames.map((name) => (
                  <PokemonIcon key={name} name={name} />
                ))}
              </RNView>
              <Text style={[styles.pokemonNames, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
                {decklist.pokemonNames.join('/')}
              </Text>
            </>
          ) : null}
          <Text style={[styles.updatedAt, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
            Last updated {formatIsoTimestampForDisplay(decklist.updatedAt)}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>Decklist</Text>
            <Pressable style={[styles.copyButton, { backgroundColor: palette.secondaryFill }]} onPress={handleCopy}>
              <Text style={[styles.copyButtonText, { color: palette.onSurfaceText }]}>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.decklistBox, { backgroundColor: palette.surface }]}>
            <Text style={[styles.decklistText, { color: palette.onSurfaceText }]} selectable>
              {decklist.decklistText || 'No decklist text yet.'}
            </Text>
          </View>
        </View>

        {linkedEvents.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>Used in events</Text>
            <View style={styles.eventCardsList}>
              {linkedEvents.map((event) => (
                <LinkedEventRow key={event.id} event={event} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.editButton, { backgroundColor: palette.accent }]}
            onPress={() => router.push({ pathname: '/decklist/[id]/edit', params: { id: String(decklist.id) } })}>
            <Text style={[styles.editButtonText, { color: palette.onAccentText }]}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.deleteButton, { backgroundColor: palette.dangerTint }]} onPress={handleDelete}>
            <Text style={[styles.deleteButtonText, { color: palette.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>

      <DuplicateDecklistModal
        visible={duplicateModalVisible}
        initialName={`${decklist.deckName} (Copy)`}
        onConfirm={handleDuplicateConfirm}
        onCancel={() => setDuplicateModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 48,
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  notFoundTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  hero: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  deckName: {
    fontSize: 21,
    fontWeight: '700',
  },
  spritesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  pokemonNames: {
    fontSize: 13.5,
  },
  updatedAt: {
    fontSize: 12.5,
    marginTop: 4,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
  copyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  decklistBox: {
    borderRadius: 12,
    padding: 14,
  },
  decklistText: {
    fontSize: 15,
    lineHeight: 20,
  },
  eventCardsList: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardPressed: {
    opacity: 0.85,
  },
  eventCardLeft: {
    flex: 1,
    gap: 2,
  },
  eventCardLine: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  eventCardThumbnailWrap: {
    width: 40,
    height: 40,
  },
  eventCardThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  eventCardThumbnailBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardThumbnailBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  eventCardStat: {
    alignItems: 'flex-end',
  },
  eventCardStatHeadline: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 21,
  },
  eventCardStatRecord: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
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
