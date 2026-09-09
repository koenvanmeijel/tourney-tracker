import { Image, PixelRatio, StyleSheet, View } from 'react-native';

import { SpritePlaceholder } from '@/components/SpritePlaceholder';
import POKEMON_ICONS from '@/assets/data/pokemonIcons.generated';
import { getIconIndex, getIconSize } from '@/utils/pokemonIcon';

const DEFAULT_SLOT_SIZE = 40;

interface PokemonIconProps {
  name: string;
  size?: number;
}

export function PokemonIcon({ name, size = DEFAULT_SLOT_SIZE }: PokemonIconProps) {
  const index = getIconIndex(name);
  const iconSize = index != null ? getIconSize(index) : null;
  const source = index != null ? POKEMON_ICONS[index] : undefined;
  if (!source || !iconSize) {
    return <SpritePlaceholder size={size} />;
  }

  const nativeDpWidth = iconSize.width / PixelRatio.get();
  const nativeDpHeight = iconSize.height / PixelRatio.get();
  const scale = Math.min(size / nativeDpWidth, size / nativeDpHeight, 1);

  return (
    <View style={[styles.slot, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={source}
        style={{ width: nativeDpWidth * scale, height: nativeDpHeight * scale }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
