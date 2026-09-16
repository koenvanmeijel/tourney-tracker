import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { getSetting, setSetting } from '@/db/settings';
import { isMatchMode, type MatchMode } from '@/utils/opponentDecks';

const MATCH_MODE_SETTING_KEY = 'dashboardMatchMode';
const THRESHOLD_SETTING_KEY = 'dashboardThreshold';
const DEFAULT_MATCH_MODE: MatchMode = 'strict';
const DEFAULT_THRESHOLD = 3;

interface MatchModeSettingsContextValue {
  matchMode: MatchMode;
  threshold: number;
  applyMatchModeSettings: (mode: MatchMode, value: number) => void;
}

const MatchModeSettingsContext = createContext<MatchModeSettingsContextValue | null>(null);

export function MatchModeSettingsProvider({ children }: { children: ReactNode }) {
  const [matchMode, setMatchMode] = useState<MatchMode>(DEFAULT_MATCH_MODE);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSetting(MATCH_MODE_SETTING_KEY), getSetting(THRESHOLD_SETTING_KEY)])
      .then(([storedMode, storedThreshold]) => {
        if (cancelled) return;
        if (storedMode && isMatchMode(storedMode)) {
          setMatchMode(storedMode);
        }
        if (storedThreshold) {
          const parsed = Number.parseInt(storedThreshold, 10);
          if (Number.isFinite(parsed) && parsed >= 1) {
            setThreshold(parsed);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function applyMatchModeSettings(mode: MatchMode, value: number) {
    setMatchMode(mode);
    setThreshold(value);
    setSetting(MATCH_MODE_SETTING_KEY, mode).catch(() => {});
    setSetting(THRESHOLD_SETTING_KEY, String(value)).catch(() => {});
  }

  return (
    <MatchModeSettingsContext.Provider value={{ matchMode, threshold, applyMatchModeSettings }}>
      {children}
    </MatchModeSettingsContext.Provider>
  );
}

export function useMatchModeSettings(): MatchModeSettingsContextValue {
  const ctx = useContext(MatchModeSettingsContext);
  if (!ctx) {
    throw new Error('useMatchModeSettings must be used within a MatchModeSettingsProvider');
  }
  return ctx;
}
