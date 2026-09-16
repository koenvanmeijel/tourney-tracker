import { StyleSheet, View as RNView } from 'react-native';

import { PokemonIcon } from '@/components/PokemonIcon';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import { formatRecordOrNull } from '@/utils/format';
import { groupRoundCount, type OpponentDeckGroup } from '@/utils/opponentDecks';
import type { getRoundResultTheme } from '@/utils/eventTheme';

export function MostPlayedRow({
  group,
  resultTheme,
}: {
  group: OpponentDeckGroup;
  resultTheme: ReturnType<typeof getRoundResultTheme>;
}) {
  const { palette } = useTheme();
  const record = formatRecordOrNull(group);
  const total = groupRoundCount(group);

  return (
    <RNView style={styles.playedRow}>
      <RNView style={styles.playedRowHeader}>
        <RNView style={styles.spriteRow}>
          {group.spritePokemon.map((mon, index) => (
            <PokemonIcon key={index} name={mon} size={26} />
          ))}
        </RNView>
        <Text style={[styles.playedRowLabel, { color: palette.text }]} numberOfLines={1}>
          {group.label} - {total} round{total === 1 ? '' : 's'}
          {record ? <Text style={{ color: palette.accent }}> ({record})</Text> : null}
        </Text>
      </RNView>
      <RNView style={[styles.barTrack, { backgroundColor: palette.borderSubtle }]}>
        {group.wins > 0 ? <RNView style={{ flex: group.wins, backgroundColor: resultTheme.win.background }} /> : null}
        {group.losses > 0 ? (
          <RNView style={{ flex: group.losses, backgroundColor: resultTheme.loss.background }} />
        ) : null}
        {group.ties > 0 ? <RNView style={{ flex: group.ties, backgroundColor: resultTheme.tie.background }} /> : null}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  playedRow: {
    gap: 6,
  },
  playedRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playedRowLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
  },
  barTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
});
