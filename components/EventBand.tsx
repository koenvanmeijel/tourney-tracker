import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PokemonIcon } from '@/components/PokemonIcon';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import type { EventType, PrizeTier } from '@/models/types';
import { getEventTypeTheme, PRIZE_ICON_COLOR } from '@/utils/eventTheme';
import { formatDeckLabel } from '@/utils/format';

function PrizeBadge({ prizeTier }: { prizeTier: PrizeTier }) {
  if (prizeTier === 'none') {
    return null;
  }
  return (
    <View style={styles.prizeBadge}>
      <SymbolView
        name={{ android: prizeTier === 'first' ? 'trophy' : 'military_tech' }}
        tintColor={PRIZE_ICON_COLOR[prizeTier]}
        size={22}
        style={styles.prizeIcon}
      />
    </View>
  );
}

interface EventBandProps {
  eventType: EventType;
  deckName: string | null;
  deckPokemon: string[];
  prizeTier: PrizeTier;
  large?: boolean;
}

export function EventBand({ eventType, deckName, deckPokemon, prizeTier, large }: EventBandProps) {
  const { themeId } = useTheme();
  const theme = getEventTypeTheme(themeId)[eventType];

  return (
    <View style={[styles.band, large && styles.bandLarge, { backgroundColor: theme.band }]}>
      <Text style={[styles.title, large && styles.titleLarge, { color: theme.onBand }]}>
        {formatDeckLabel(deckName, deckPokemon)}
      </Text>
      <View style={styles.right}>
        {deckPokemon.slice(0, 2).map((pokemon, index) => (
          <PokemonIcon key={index} name={pokemon} />
        ))}
        <PrizeBadge prizeTier={prizeTier} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bandLarge: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    flexShrink: 1,
  },
  titleLarge: {
    fontSize: 21,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  prizeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  prizeIcon: {
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
  },
});
