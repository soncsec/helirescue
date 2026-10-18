// Recoloured variants of art-pack sprites (art test candidates).
// Reads from legacy/ (read-only, CC0) and writes new PNGs.
// Run: node tools/art/recolour.mjs <out-dir> [--preview]
import { readPng, Rgba } from './lib.mjs';

const LEGACY = new URL('../../legacy/Warped/Characters/', import.meta.url).pathname;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const key = (p) =>
  '#' +
  p
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');

/** Swaps exact colours; anything not in the map is kept. */
function swap(img, map) {
  return img.recolour((p) => (p[3] && map[key(p)] ? [...hex(map[key(p)]), p[3]] : p));
}

// The trench-coat character's coat, coat shade, coat dark and skin colours.
const COAT = ['#99391e', '#782812', '#542718'];
const SKIN = '#f29a4e';
const CIVILIANS = {
  blue: { coat: ['#3a6ea5', '#2a4f7a', '#1e3352'], skin: '#f29a4e' },
  green: { coat: ['#5f8a3a', '#456828', '#2f4a1c'], skin: '#c87a46' },
  yellow: { coat: ['#d9a640', '#a87a26', '#6e4f18'], skin: '#8a5232' },
};

// The space marine's orange suit and pale helmet become olive drab and grey.
const ENEMY = {
  '#9b3813': '#5e6b34',
  '#7d230e': '#46512a',
  '#e0802f': '#8a9a52',
  '#c45b1e': '#6f7d3c',
  '#caa492': '#767a85',
  '#dec4b3': '#9a9eaa',
  '#93675b': '#5a5d66',
  '#613e39': '#43454d',
  // The shoot frames use their own shades; the muzzle flash stays orange.
  '#b43506': '#5e6b34',
  '#911c04': '#46512a',
  '#921e04': '#46512a',
  '#e05b10': '#6f7d3c',
  '#d8a593': '#767a85',
  '#e8c5b4': '#9a9eaa',
  '#a2675a': '#5a5d66',
  '#6c3c36': '#43454d',
};

const out = process.argv[2] ?? 'tools/art/out';
const preview = process.argv[3] === '--preview';
const walk = readPng(`${LEGACY}cyberpunk-detective/spritesheets/walk.png`);
for (const [name, v] of Object.entries(CIVILIANS)) {
  const map = Object.fromEntries(COAT.map((c, i) => [c, v.coat[i]]));
  map[SKIN] = v.skin;
  const img = swap(walk, map);
  img.save(`${out}/civilian-${name}-walk.png`);
  if (preview) img.save(`${out}/preview/civilian-${name}-x4.png`, 4);
}

// Soldier: run (10 frames), shoot (2) and die (3) frames, each 75x48, in one sheet.
const marine = `${LEGACY}space-marine-lite/Sprites/`;
const frames = [
  ...Array.from({ length: 10 }, (_, i) => `Run with Gun/sprites/run-with-gun${i + 1}.png`),
  'Shoot/sprites/shoot1.png',
  'Shoot/sprites/shoot2.png',
  'Die/sprites/die1.png',
  'Die/sprites/die2.png',
  'Die/sprites/die3.png',
].map((f) => readPng(marine + f));
const soldier = new Rgba(75 * frames.length, 48);
frames.forEach((f, i) => soldier.stamp(swap(f, ENEMY), i * 75, 0));
soldier.save(`${out}/soldier.png`);
if (preview) soldier.crop(0, 0, 75 * 3, 48).save(`${out}/preview/soldier-x4.png`, 4);
