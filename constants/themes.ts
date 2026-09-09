export type ThemeId = 'default' | 'umbreon' | 'sylveon' | 'budew';

export interface Palette {
  /** Screen background. */
  background: string;
  /** Primary body text, sitting directly on `background`. */
  text: string;

  /** Card/dialog/input/chip surface */
  surface: string;
  /** Text sitting on `surface` */
  onSurfaceText: string;

  /** Primary action / link / selected-state color */
  accent: string;
  /** Text/icon color for content sitting directly on a solid `accent`
   * fill */
  onAccentText: string;
  /** A low-alpha tint of `accent`, for a tinted (not solid-filled)
   * background — date pills, the "+ Add round" button, ... */
  accentTint: string;

  /** Destructive-action color */
  danger: string;
  /** A low-alpha tint of `danger`. */
  dangerTint: string;

  /** Input/chip borders. */
  border: string;
  /** Card/divider borders — a step more subtle than `border`. */
  borderSubtle: string;
  /** Low-emphasis interactive surface */
  secondaryFill: string;
  /** An even more subtle *neutral* fill (never a secondary accent)*/
  neutralFillSubtle: string;

  /** Inactive tab bar icon color. */
  tabIconInactive: string;
  /** Modal/dialog backdrop dimming. */
  backdrop: string;
  /** Status bar icon color */
  statusBarStyle: 'light' | 'dark';
}

const DEFAULT_PALETTE: Palette = {
  background: '#EEF6FC',
  text: '#000000',

  surface: '#FFFFFF',
  onSurfaceText: '#1A1A1A',

  accent: '#2F95DC',
  onAccentText: '#FFFFFF',
  accentTint: 'rgba(47,149,220,0.12)',

  danger: '#D9534F',
  dangerTint: 'rgba(217,83,79,0.15)',

  border: 'rgba(128,128,128,0.4)',
  borderSubtle: 'rgba(128,128,128,0.35)',
  secondaryFill: 'rgba(128,128,128,0.15)',
  neutralFillSubtle: 'rgba(128,128,128,0.08)',

  tabIconInactive: '#CCCCCC',
  backdrop: 'rgba(15,23,42,0.5)',
  statusBarStyle: 'dark',
};

const UMBREON_PALETTE: Palette = {
  background: '#1B1B21',
  text: '#F2F2F5',

  surface: '#26262E',
  onSurfaceText: '#F2F2F5',

  accent: '#F2C94C',
  onAccentText: '#1B1B21',
  accentTint: 'rgba(242,201,76,0.16)',

  danger: '#E5665F',
  dangerTint: 'rgba(229,102,95,0.22)',

  border: 'rgba(255,255,255,0.18)',
  borderSubtle: 'rgba(255,255,255,0.12)',
  secondaryFill: 'rgba(255,255,255,0.09)',
  neutralFillSubtle: 'rgba(255,255,255,0.06)',

  tabIconInactive: '#8A8A93',
  backdrop: 'rgba(0,0,0,0.6)',
  statusBarStyle: 'light',
};

const SYLVEON_PALETTE: Palette = {
  background: '#FCF1F6',
  text: '#241820',

  surface: '#FFFFFF',
  onSurfaceText: '#241820',

  accent: '#D6558F',
  onAccentText: '#FFFFFF',
  accentTint: 'rgba(214,85,143,0.14)',

  danger: '#D9534F',
  dangerTint: 'rgba(217,83,79,0.15)',

  border: 'rgba(128,128,128,0.4)',
  borderSubtle: 'rgba(128,128,128,0.35)',
  secondaryFill: 'rgba(130,203,245,0.35)',
  neutralFillSubtle: 'rgba(128,128,128,0.08)',

  tabIconInactive: '#CCCCCC',
  backdrop: 'rgba(36,24,32,0.5)',
  statusBarStyle: 'dark',
};

const BUDEW_PALETTE: Palette = {
  background: '#F1F7F1',
  text: '#1A2A1A',

  surface: '#FFFFFF',
  onSurfaceText: '#1A2A1A',

  accent: '#4C9A4C',
  onAccentText: '#FFFFFF',
  accentTint: 'rgba(76,154,76,0.14)',

  danger: '#D9534F',
  dangerTint: 'rgba(217,83,79,0.15)',

  border: 'rgba(128,128,128,0.4)',
  borderSubtle: 'rgba(128,128,128,0.35)',
  secondaryFill: 'rgba(0,174,235,0.35)',
  neutralFillSubtle: 'rgba(128,128,128,0.08)',

  tabIconInactive: '#CCCCCC',
  backdrop: 'rgba(26,42,26,0.5)',
  statusBarStyle: 'dark',
};

export const THEMES: Record<ThemeId, Palette> = {
  default: DEFAULT_PALETTE,
  umbreon: UMBREON_PALETTE,
  sylveon: SYLVEON_PALETTE,
  budew: BUDEW_PALETTE,
};

export const THEME_OPTIONS: { value: ThemeId; label: string }[] = [
  { value: 'default', label: 'Light Default' },
  { value: 'sylveon', label: 'Pink Sylveon' },
  { value: 'budew', label: 'Grün Knospi' },
  { value: 'umbreon', label: 'Dark Umbreon' },
];

export const DEFAULT_THEME_ID: ThemeId = 'default';
