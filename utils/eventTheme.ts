import type { ThemeId } from '@/constants/themes';
import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventType, type PrizeTier, type RoundResult } from '@/models/types';

export interface EventTypeTheme {
  /** Card header band background. */
  band: string;
  /** Text/icon color for content sitting directly on the band. */
  onBand: string;
  /** Record-text color in the card body, echoing the band's hue. */
  accentText: string;
}

const NEUTRAL: EventTypeTheme = {
  band: '#23262F',
  onBand: '#F7F7F8',
  accentText: '#52565F',
};

const CHALLENGE: EventTypeTheme = {
  band: '#2FA98C',
  onBand: '#FFFFFF',
  accentText: '#1F7A68',
};

const CUP: EventTypeTheme = {
  band: '#E3B341',
  onBand: '#2B2108',
  accentText: '#96741F',
};

const PRESTIGE: EventTypeTheme = {
  band: '#6D4AB8',
  onBand: '#FFFFFF',
  accentText: '#4F3585',
};

export const EVENT_TYPE_THEME: Record<EventType, EventTypeTheme> = {
  local: NEUTRAL,
  off_meta: NEUTRAL,
  other: NEUTRAL,
  challenge: CHALLENGE,
  cup: CUP,
  regional: PRESTIGE,
  international: PRESTIGE,
  world: PRESTIGE,
};

/** Umbreon/Dark theme only overwrites NEUTRAL color */
const NEUTRAL_UMBREON: EventTypeTheme = {
  band: '#55555F',
  onBand: '#F7F7F8',
  accentText: '#B7B7C2',
};

export function getEventTypeTheme(themeId: ThemeId): Record<EventType, EventTypeTheme> {
  if (themeId !== 'umbreon') {
    return EVENT_TYPE_THEME;
  }
  return { ...EVENT_TYPE_THEME, local: NEUTRAL_UMBREON, off_meta: NEUTRAL_UMBREON, other: NEUTRAL_UMBREON };
}

export interface EventTypeOption {
  value: EventType;
  label: string;
  color: string;
  textColor: string;
}

export function getEventTypeOptions(themeId: ThemeId): EventTypeOption[] {
  const eventTypeTheme = getEventTypeTheme(themeId);
  return EVENT_TYPES.map((value) => {
    const theme = eventTypeTheme[value];
    return { value, label: EVENT_TYPE_LABELS[value], color: theme.band, textColor: theme.onBand };
  });
}

export const PRIZE_ICON_COLOR: Record<Exclude<PrizeTier, 'none'>, string> = {
  prize: '#1F8A73',
  first: '#B8860B',
};

export interface RoundResultTheme {
  /** Full banner background for the round row. */
  background: string;
  /** Text/icon color for content sitting on the banner. */
  text: string;
}

export const ROUND_RESULT_THEME: Record<RoundResult, RoundResultTheme> = {
  win: { background: CHALLENGE.band, text: CHALLENGE.onBand },
  loss: { background: '#a92f2f', text: '#FFFFFF' },
  tie: { background: CUP.band, text: CUP.onBand },
  id: { background: CUP.band, text: CUP.onBand },
  bye: { background: CHALLENGE.band, text: CHALLENGE.onBand },
  no_show: { background: CHALLENGE.band, text: CHALLENGE.onBand },
};

/** Sylveon/Pink theme overwrites ROUND_RESULT_THEME colors */
const ROUND_RESULT_THEME_SYLVEON: Record<RoundResult, RoundResultTheme> = {
  win: { background: '#BFE8DC', text: '#1F6F5C' },
  loss: { background: '#F6C9C9', text: '#8C2F2F' },
  tie: { background: '#F5E3B3', text: '#6B4F14' },
  id: { background: '#F5E3B3', text: '#6B4F14' },
  bye: { background: '#BFE8DC', text: '#1F6F5C' },
  no_show: { background: '#BFE8DC', text: '#1F6F5C' },
};

export function getRoundResultTheme(themeId: ThemeId): Record<RoundResult, RoundResultTheme> {
  return themeId === 'sylveon' ? ROUND_RESULT_THEME_SYLVEON : ROUND_RESULT_THEME;
}
