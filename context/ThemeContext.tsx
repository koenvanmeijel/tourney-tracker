import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_THEME_ID, THEMES, type Palette, type ThemeId } from '@/constants/themes';
import { getSetting, setSetting } from '@/db/settings';

const THEME_SETTING_KEY = 'theme';

interface ThemeContextValue {
  themeId: ThemeId;
  palette: Palette;
  setThemeId: (id: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string): value is ThemeId {
  return value in THEMES;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    let cancelled = false;
    getSetting(THEME_SETTING_KEY)
      .then((stored) => {
        if (!cancelled && stored && isThemeId(stored)) {
          setThemeIdState(stored);
        }
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    await setSetting(THEME_SETTING_KEY, id);
  }, []);

  const value = useMemo(() => ({ themeId, palette: THEMES[themeId], setThemeId }), [themeId, setThemeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
