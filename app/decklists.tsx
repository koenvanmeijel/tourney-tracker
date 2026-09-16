import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View as RNView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { PokemonIcon } from '@/components/PokemonIcon';
import { Text, View } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useDecklists } from '@/context/DecklistsContext';
import { useTheme } from '@/context/ThemeContext';
import type { DecklistRecord } from '@/models/types';
import { formatIsoTimestampForDisplay } from '@/utils/date';

function AddButton() {
  const { palette } = useTheme();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/decklist/add')} style={styles.headerButton} hitSlop={8}>
      <SymbolView
        name={{ ios: 'plus.circle', android: 'add_circle', web: 'add' }}
        tintColor={palette.text}
        size={24}
      />
    </Pressable>
  );
}

function DecklistRow({ decklist }: { decklist: DecklistRecord }) {
  const router = useRouter();
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: palette.surface }, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/decklist/[id]', params: { id: String(decklist.id) } })}>
      <RNView style={styles.cardHeader}>
        <Text style={[styles.deckName, { color: palette.onSurfaceText }]} numberOfLines={1}>
          {decklist.deckName}
        </Text>
        {decklist.pokemonNames.length > 0 ? (
          <RNView style={styles.sprites}>
            {decklist.pokemonNames.slice(0, 2).map((name, index) => (
              <PokemonIcon key={index} name={name} size={32} />
            ))}
          </RNView>
        ) : null}
      </RNView>

      <RNView style={styles.cardFooter}>
        <Text style={[styles.updatedAt, { color: palette.onSurfaceText, opacity: MUTED_TEXT_OPACITY }]}>
          Last updated {formatIsoTimestampForDisplay(decklist.updatedAt)}
        </Text>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
          hitSlop={8}
          style={[styles.expandButton, { backgroundColor: palette.neutralFillSubtle }]}>
          <Text style={[styles.expandButtonText, { color: palette.onSurfaceText }]}>
            {expanded ? 'Collapse' : 'Expand'}
          </Text>
          <SymbolView
            name={{
              ios: expanded ? 'chevron.up' : 'chevron.down',
              android: expanded ? 'expand_less' : 'expand_more',
              web: expanded ? 'expand_less' : 'expand_more',
            }}
            tintColor={palette.onSurfaceText}
            size={14}
          />
        </Pressable>
      </RNView>

      {expanded ? (
        <RNView style={[styles.decklistBox, { backgroundColor: palette.neutralFillSubtle }]}>
          <Text style={[styles.decklistText, { color: palette.onSurfaceText }]}>
            {decklist.decklistText || 'No decklist text yet.'}
          </Text>
        </RNView>
      ) : null}
    </Pressable>
  );
}

export default function DecklistsScreen() {
  const { decklists, loading } = useDecklists();
  const { palette } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'My Decklists', headerRight: () => <AddButton /> }} />
      <View style={styles.screen}>
        {!loading && decklists.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No decklists yet</Text>
            <Text style={[styles.emptySubtitle, { color: palette.text, opacity: MUTED_TEXT_OPACITY }]}>
              Tap the + button above to add one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={decklists}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <DecklistRow decklist={item} />}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  deckName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  sprites: {
    flexDirection: 'row',
    gap: 2,
    flexShrink: 0,
  },
  decklistBox: {
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  decklistText: {
    fontSize: 14,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  updatedAt: {
    fontSize: 12,
    marginTop: 2,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  expandButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
