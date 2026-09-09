import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { HEADER_TITLE_STYLE } from '@/constants/headerStyle';
import { PokemonIcon } from '@/components/PokemonIcon';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useTheme } from '@/context/ThemeContext';
import { getRandomBaseFormId } from '@/utils/pokemonIcon';

const HEADER_SPRITE_ID = getRandomBaseFormId();

function HeaderTitle() {
  const { palette } = useTheme();
  return (
    <View style={styles.headerTitle}>
      <View style={styles.headerIconWrap}>
        <PokemonIcon name={HEADER_SPRITE_ID} size={28} />
      </View>
      <Text style={[HEADER_TITLE_STYLE, { color: palette.text }]}>Tourney Tracker</Text>
    </View>
  );
}

export default function TabLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.tabIconInactive,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.borderSubtle },
        headerTitleStyle: HEADER_TITLE_STYLE,
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tourney Tracker',
          tabBarLabel: 'Events',
          headerTitle: () => <HeaderTitle />,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'list.bullet', android: 'list', web: 'list' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Event',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'plus.circle', android: 'add_circle', web: 'add' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    marginVertical: 0,
  },
});
