import { Pressable, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { Select } from '@/components/form/Select';
import { Text, View } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { THEME_OPTIONS } from '@/constants/themes';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { themeId, palette, setThemeId } = useTheme();
  // version number source of truth is package.json
  const appVersion = Constants.expoConfig?.version;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>

        <Select options={THEME_OPTIONS} value={themeId} onChange={setThemeId} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Pressable
          style={[styles.button, { backgroundColor: palette.secondaryFill }]}
          onPress={() => router.push('/data-management')}>
          <Text style={styles.secondaryButtonText}>Data Management</Text>
        </Pressable>
      </View>

      <Text style={styles.credits}>
        Tourney Tracker v{appVersion} — built by Koen van Meijel for Budew&apos;s Basement.{'\n'}© 2026, not
        affiliated with Pokémon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 32,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
  },
  credits: {
    marginTop: 'auto',
    paddingTop: 20,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    opacity: MUTED_TEXT_OPACITY,
  },
});
