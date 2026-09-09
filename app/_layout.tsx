import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import { HEADER_TITLE_STYLE } from '@/constants/headerStyle';
import { AppAlertProvider } from '@/context/AppAlertContext';
import { EventsProvider } from '@/context/EventsContext';
import { MarkersProvider } from '@/context/MarkersContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // ThemeProvider (our own, the selected-palette one — see
  // context/ThemeContext.tsx) has to sit outside RootLayoutNav, which
  // reads useTheme() to build react-navigation's own Theme object below.
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { palette } = useTheme();

  const navigationTheme = useMemo(
    () => ({
      dark: palette.statusBarStyle === 'light',
      colors: {
        primary: palette.accent,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        border: palette.border,
        notification: palette.danger,
      },
      fonts: DefaultTheme.fonts,
    }),
    [palette]
  );

  return (
    <KeyboardProvider>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={palette.statusBarStyle} />
        <AppAlertProvider>
          <EventsProvider>
            <MarkersProvider>
              <Stack
                screenOptions={{
                  headerTitleStyle: HEADER_TITLE_STYLE,
                  headerStyle: { backgroundColor: palette.surface },
                  headerTintColor: palette.text,
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </MarkersProvider>
          </EventsProvider>
        </AppAlertProvider>
      </NavigationThemeProvider>
    </KeyboardProvider>
  );
}
