import lookup from '@/assets/data/pokemon-icon-lookup.json';

interface PokemonIconLookup {
  dexNumbers: Record<string, number>;
  iconOverrides: Record<string, number>;
  iconSizes: Record<string, number[]>;
}

const { dexNumbers, iconOverrides, iconSizes } = lookup as PokemonIconLookup;

// ninetalesalola -> "Alolan Ninetales"
const REGIONAL_FORM_PREFIXES: Record<string, string> = {
  alolan: 'alola',
  galarian: 'galar',
  hisuian: 'hisui',
  paldean: 'paldea',
};

// charizardmegax -> "Mega Charizard X"
const MEGA_PATTERN = /^mega\s+(.+?)(?:\s+([xyz]))?$/;

// manual exceptions
const NAME_ALIASES: Record<string, string> = {
  'wellspring ogerpon': 'ogerponwellspring',
  'wellspring mask ogerpon': 'ogerponwellspring',
  'hearthflame ogerpon': 'ogerponhearthflame',
  'hearthflame mask ogerpon': 'ogerponhearthflame',
  'cornerstone ogerpon': 'ogerponcornerstone',
  'cornerstone mask ogerpon': 'ogerponcornerstone',
  'ice calyrex':'calyrexice',
  'ice rider calyrex':'calyrexice',
  'shadow calyrex':'calyrexshadow',
  'shadow rider calyrex':'calyrexshadow'
};

export function toShowdownId(rawName: string): string {
  let name = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // for Flabébé
    .replace(/♀/g, 'f') // for Nidoran♀
    .replace(/♂/g, 'm') // for Nidoran♂
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // collapse doubled/odd whitespace before the alias lookup below

  const alias = NAME_ALIASES[name];
  if (alias) {
    return alias;
  }

  for (const [prefix, suffix] of Object.entries(REGIONAL_FORM_PREFIXES)) {
    const match = name.match(new RegExp(`^${prefix}\\s+(.+)$`));
    if (match) {
      name = `${match[1]}-${suffix}`;
      break;
    }
  }

  const megaMatch = name.match(MEGA_PATTERN);
  if (megaMatch) {
    const [, base, variant] = megaMatch;
    name = `${base}mega${variant ?? ''}`;
  }

  return name.replace(/[^a-z0-9]+/g, '');
}

export function getIconIndex(rawName: string): number | null {
  const id = toShowdownId(rawName);
  return iconOverrides[id] ?? dexNumbers[id] ?? null;
}

const BASE_FORM_IDS: string[] = (() => {
  const shortestById = new Map<number, string>();
  for (const [id, dexNumber] of Object.entries(dexNumbers)) {
    const current = shortestById.get(dexNumber);
    if (!current || id.length < current.length) {
      shortestById.set(dexNumber, id);
    }
  }
  return [...shortestById.values()];
})();

export function getRandomBaseFormId(): string {
  return BASE_FORM_IDS[Math.floor(Math.random() * BASE_FORM_IDS.length)];
}

export interface IconSize {
  width: number;
  height: number;
}

export function getIconSize(index: number): IconSize | null {
  const [width, height] = iconSizes[index] ?? [];
  return width != null && height != null ? { width, height } : null;
}
