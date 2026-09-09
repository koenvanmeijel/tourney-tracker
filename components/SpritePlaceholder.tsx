import { Image, PixelRatio, StyleSheet, View } from 'react-native';

import POKEMON_ICONS from '@/assets/data/pokemonIcons.generated';
import { getIconSize } from '@/utils/pokemonIcon';

const UNOWN_QUESTION_INDEX = 1041;
const SOURCE = POKEMON_ICONS[UNOWN_QUESTION_INDEX];
const ICON_SIZE = getIconSize(UNOWN_QUESTION_INDEX);

interface SpritePlaceholderProps {
  size?: number;
}

export function SpritePlaceholder({ size = 40 }: SpritePlaceholderProps) {
  let displayWidth = size;
  let displayHeight = size;
  if (ICON_SIZE) {
    const nativeDpWidth = ICON_SIZE.width / PixelRatio.get();
    const nativeDpHeight = ICON_SIZE.height / PixelRatio.get();
    const scale = Math.min(size / nativeDpWidth, size / nativeDpHeight, 1);
    displayWidth = nativeDpWidth * scale;
    displayHeight = nativeDpHeight * scale;
  }

  return (
    <View style={[styles.slot, { width: size, height: size, borderRadius: size / 2 }]}>
      {SOURCE ? (
        <Image source={SOURCE} style={{ width: displayWidth, height: displayHeight }} resizeMode="contain" />
      ) : null}
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
