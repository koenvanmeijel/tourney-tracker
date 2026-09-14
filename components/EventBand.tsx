import { Image, StyleSheet, View } from 'react-native';

import { PokemonIcon } from '@/components/PokemonIcon';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import type { EventType, PrizeTier } from '@/models/types';
import { getEventTypeTheme } from '@/utils/eventTheme';
import { formatDeckLabel } from '@/utils/format';

const PRIZE_ICON_SOURCE: Record<Exclude<PrizeTier, 'none'>, number> = {
  first: require('@/assets/sprites/icons/trophy.png'),
  prize: require('@/assets/sprites/icons/medal.png'),
};

function PrizeBadge({ prizeTier }: { prizeTier: PrizeTier }) {
  if (prizeTier === 'none') {
    return null;
  }
  return (
    <Image source={PRIZE_ICON_SOURCE[prizeTier]} style={styles.prizeIcon} resizeMode="contain" />
  );
}

interface EventBandProps {
  eventType: EventType;
  deckName: string | null;
  deckPokemon: string[];
  prizeTier: PrizeTier;
  large?: boolean;
  isUpcoming?: boolean;
}

export function EventBand({ eventType, deckName, deckPokemon, prizeTier, large, isUpcoming }: EventBandProps) {
  const { themeId } = useTheme();
  const theme = getEventTypeTheme(themeId)[eventType];

  return (
    <View style={[styles.band, large && styles.bandLarge, { backgroundColor: theme.band }]}>
      <Text style={[styles.title, large && styles.titleLarge, { color: theme.onBand }]}>
        {isUpcoming ? '🕐 Upcoming event' : formatDeckLabel(deckName, deckPokemon)}
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
  prizeIcon: {
    width: 28,
    height: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
