#!/usr/bin/env node

// Usage: node scripts/update-pokemon-icons.mjs
//
// What it pulls:
// - pokedex-mini.js (a file Showdown's own client serves at runtime).
// - battle-dex-data.ts (from the client's GitHub source, not a served
//   asset) gives BattlePokemonIconIndexes — for exceptions to the default.
//
// Two more layers on top of what Showdown gives us directly:
// - BattlePokemonIconIndexes bundles CAP (Create-A-Pokémon, fan-made)
//   cut off by CAP_ICON_INDEX_CUTOFF.
// - pokemon-icon-overrides.json (hand-maintained)

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOOKUP_OUT = join(ROOT, 'assets/data/pokemon-icon-lookup.json');
const ICONS_DIR = join(ROOT, 'assets/sprites/pokemon-icons');
const ICONS_MODULE_OUT = join(ROOT, 'assets/data/pokemonIcons.generated.ts');
const ICON_OVERRIDES_FILE = join(ROOT, 'scripts/pokemon-icon-overrides.json');
const OLD_SHEET = join(ROOT, 'assets/sprites/pokemonicons-sheet.png');
const OLD_DATA = join(ROOT, 'assets/data/pokemon-icon-data.json');

const RAW_CELL_WIDTH = 40;
const RAW_CELL_HEIGHT = 30;
const COLUMNS = 12;
const UPSCALE_FACTOR = 3;
const TRIM_MARGIN = 1;

const CAP_ICON_INDEX_CUTOFF = 1560;

const POKEDEX_MINI_URL = 'https://play.pokemonshowdown.com/data/pokedex-mini.js';
const ICON_SHEET_URL = 'https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png';
const BATTLE_DEX_DATA_URL =
  'https://raw.githubusercontent.com/smogon/pokemon-showdown-client/master/play.pokemonshowdown.com/src/battle-dex-data.ts';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function runPython(code) {
  return execFileSync('python3', ['-c', code]).toString();
}

async function main() {
  console.log('Fetching dex numbers from', POKEDEX_MINI_URL);
  const pokedexMiniSource = await fetchText(POKEDEX_MINI_URL);
  const pokedexModule = { exports: {} };
  new Function('module', 'exports', pokedexMiniSource)(pokedexModule, pokedexModule.exports);
  const sprites = pokedexModule.exports.BattlePokemonSprites;
  const dexNumbers = {};
  for (const [name, entry] of Object.entries(sprites)) {
    if (typeof entry.num === 'number' && entry.num > 0) {
      dexNumbers[name] = entry.num;
    }
  }
  console.log(`  ${Object.keys(dexNumbers).length} species with a dex number`);

  console.log('Fetching icon-index exceptions from', BATTLE_DEX_DATA_URL);
  const battleDexDataSource = await fetchText(BATTLE_DEX_DATA_URL);
  const match = battleDexDataSource.match(
    /export const BattlePokemonIconIndexes: \{ \[id: string\]: number \} = (\{[\s\S]*?\n\});/
  );
  if (!match) {
    throw new Error(
      'Could not find BattlePokemonIconIndexes in battle-dex-data.ts — its shape may have changed; open the file and adjust the regex above.'
    );
  }
  const iconOverrides = new Function(`return (${match[1]});`)();
  console.log(`  ${Object.keys(iconOverrides).length} icon-index overrides`);

  const capEntries = Object.entries(iconOverrides)
    .filter(([, index]) => index >= CAP_ICON_INDEX_CUTOFF)
    .sort((a, b) => a[1] - b[1]);
  for (const [name] of capEntries) {
    delete iconOverrides[name];
  }
  if (capEntries.length > 0) {
    console.log(
      `  Cut ${capEntries.length} CAP (fan-made) entries at/after index ${CAP_ICON_INDEX_CUTOFF} (first: "${capEntries[0][0]}" at ${capEntries[0][1]}) — if that name looks like a real species, raise CAP_ICON_INDEX_CUTOFF instead of letting it through.`
    );
  }

  console.log('Applying hand-maintained overrides from', ICON_OVERRIDES_FILE);
  const handOverrides = JSON.parse(readFileSync(ICON_OVERRIDES_FILE, 'utf8'));
  for (const [id, preferredId] of Object.entries(handOverrides)) {
    const resolved = iconOverrides[preferredId] ?? dexNumbers[preferredId];
    if (resolved == null) {
      throw new Error(
        `pokemon-icon-overrides.json: "${id}" points at "${preferredId}", which doesn't resolve to any known icon — check the id against assets/data/pokemon-icon-lookup.json from a previous run.`
      );
    }
    iconOverrides[id] = resolved;
    console.log(`  ${id} -> ${preferredId} (cell ${resolved})`);
  }

  const cells = [...new Set([...Object.values(dexNumbers), ...Object.values(iconOverrides)])].sort(
    (a, b) => a - b
  );
  console.log(`  ${cells.length} distinct icon cells actually referenced`);

  console.log('Downloading icon sheet from', ICON_SHEET_URL);
  const sheetRes = await fetch(ICON_SHEET_URL);
  if (!sheetRes.ok) throw new Error(`${ICON_SHEET_URL} -> HTTP ${sheetRes.status}`);
  const rawSheetBuffer = Buffer.from(await sheetRes.arrayBuffer());

  const workDir = mkdtempSync(join(tmpdir(), 'pokemon-icons-'));
  const rawSheetPath = join(workDir, 'sheet.png');
  writeFileSync(rawSheetPath, rawSheetBuffer);

  mkdirSync(ICONS_DIR, { recursive: true });
  for (const existing of readdirSync(ICONS_DIR)) {
    rmSync(join(ICONS_DIR, existing));
  }

  console.log(`Cropping ${cells.length} icons (trimmed to content) at ${UPSCALE_FACTOR}x nearest-neighbor (via Pillow)...`);
  const sizesOutput = runPython(`
from PIL import Image
sheet = Image.open(${JSON.stringify(rawSheetPath)}).convert("RGBA")
cells = [${cells.join(',')}]
cw, ch, cols, factor, margin = ${RAW_CELL_WIDTH}, ${RAW_CELL_HEIGHT}, ${COLUMNS}, ${UPSCALE_FACTOR}, ${TRIM_MARGIN}
for cell in cells:
    col, row = cell % cols, cell // cols
    icon = sheet.crop((col*cw, row*ch, col*cw+cw, row*ch+ch))
    # Each icon's own canvas has a lot of built-in transparent padding
    # around the actual character (varies a lot by Pokémon — Starmie's
    # content is barely half its cell). Trim to the alpha channel's
    # bounding box (not a plain getbbox() on the RGBA image, which can
    # miss padding that has non-zero RGB under a fully transparent alpha)
    # so the visible creature fills more of the badge, plus a small fixed
    # margin so nothing touches the very edge.
    bbox = icon.split()[-1].getbbox()
    if bbox:
        left, top, right, bottom = bbox
        left, top = max(0, left - margin), max(0, top - margin)
        right, bottom = min(cw, right + margin), min(ch, bottom + margin)
        icon = icon.crop((left, top, right, bottom))
    icon = icon.resize((icon.width*factor, icon.height*factor), Image.NEAREST)
    icon.save(${JSON.stringify(ICONS_DIR)} + f"/{cell}.png")
    print(f"{cell},{icon.width},{icon.height}")
`);
  rmSync(workDir, { recursive: true, force: true });

  const iconSizes = {};
  for (const line of sizesOutput.trim().split('\n')) {
    const [cell, width, height] = line.split(',').map(Number);
    iconSizes[cell] = [width, height];
  }

  writeFileSync(LOOKUP_OUT, JSON.stringify({ dexNumbers, iconOverrides, iconSizes }, null, 1));

  const iconsModuleLines = cells.map((cell) => `  ${cell}: require('../sprites/pokemon-icons/${cell}.png'),`);
  writeFileSync(
    ICONS_MODULE_OUT,
    `// GENERATED by scripts/update-pokemon-icons.mjs — do not edit by hand.
const POKEMON_ICONS: Record<number, number> = {
${iconsModuleLines.join('\n')}
};

export default POKEMON_ICONS;
`
  );

  for (const stale of [OLD_SHEET, OLD_DATA]) {
    rmSync(stale, { force: true });
  }

  console.log(`\nWrote ${cells.length} files to ${ICONS_DIR}`);
  console.log(`Wrote ${LOOKUP_OUT}`);
  console.log(`Wrote ${ICONS_MODULE_OUT}`);
  console.log('\nSpot-check a few names before committing, e.g.:');
  for (const name of ['charizard', 'ironhands', 'gholdengo', 'ninetalesalola', 'terapagos']) {
    console.log(`  ${name}: dexNumber=${dexNumbers[name]} override=${iconOverrides[name]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
