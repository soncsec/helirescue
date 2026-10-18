// Claude-made building tiles (art test candidate): 16x16 tiles that the game
// assembles into buildings with flat roofs to land on (ARCHITECTURE.md H4).
// Run: node tools/art/buildings.mjs <out-dir>
// Writes buildings-night.png and buildings-war.png: one row of 16 tiles each.
import { Grid, sheet, save } from './lib.mjs';

const T = 16;

/** Tile order in the sheet (the game's building builder uses these indexes). */
export const TILES = [
  'roofLeft',
  'roofMid',
  'roofRight',
  'wallLeft',
  'windowLit',
  'windowDark',
  'windowBroken',
  'wallRight',
  'wallPlain',
  'door',
  'sign',
  'helipad',
  'acUnit',
  'antenna',
  'rubble',
  'roofDamaged',
];

// Colour slots shared by both palettes.
const [, K, WD, WM, WL, LIT, LITH, DARK, GLINT, LEDGE, ROOF, CRACK, PAD, PADW, NEON, NEON2, RUST] =
  Array.from({ length: 17 }, (_, i) => i);

const PALETTES = {
  night: [
    '',
    '#140f1f', // outline
    '#2b1e3a', // wall dark
    '#3d2a52', // wall
    '#5a3f73', // wall edge light
    '#ffb347', // lit window
    '#ffe08a', // lit window highlight
    '#1a2340', // dark window
    '#3a5a8a', // window glint
    '#6b5585', // roof ledge
    '#8d78a6', // roof top
    '#22182f', // crack
    '#ffd23f', // helipad yellow
    '#e6ebf2', // helipad white
    '#ff4f9a', // neon pink
    '#3fe0e0', // neon cyan
    '#8a4a2a', // rust
  ],
  war: [
    '',
    '#17141c',
    '#3a3736',
    '#55504c',
    '#77706a',
    '#e8a33c',
    '#ffd27a',
    '#1f2328',
    '#4a5966',
    '#8a837b',
    '#a69e94',
    '#26221f',
    '#ffd23f',
    '#e6ebf2',
    '#d8503c',
    '#7fb8c8',
    '#7a4426',
  ],
};

function wall(g, edge) {
  g.rect(0, 0, T - 1, T - 1, WM);
  // Brick courses every 4 rows for texture.
  for (let y = 3; y < T; y += 4) g.rect(0, y, T - 1, y, WD);
  if (edge === 'left') g.rect(0, 0, 1, T - 1, WL);
  if (edge === 'right') g.rect(T - 2, 0, T - 1, T - 1, WD);
}

function roof(g, edge) {
  wall(g, edge);
  g.rect(0, 0, T - 1, 1, ROOF);
  g.rect(0, 2, T - 1, 4, LEDGE);
  g.rect(0, 5, T - 1, 5, WD);
  if (edge === 'left') g.rect(0, 0, 1, 5, ROOF);
  if (edge === 'right') g.rect(T - 1, 0, T - 1, 5, WD);
}

function windowTile(g, kind) {
  wall(g);
  g.rect(3, 2, 12, 12, WD); // frame
  if (kind === 'lit') {
    g.rect(4, 3, 11, 11, LIT);
    g.rect(4, 3, 6, 5, LITH);
    g.rect(7, 3, 8, 11, WD); // mullion
  } else if (kind === 'dark') {
    g.rect(4, 3, 11, 11, DARK);
    g.line(5, 9, 9, 5, GLINT);
    g.rect(7, 3, 8, 11, WD);
  } else {
    g.rect(4, 3, 11, 11, K);
    // Jagged glass shards left in the frame.
    g.poly(
      [
        [4, 3],
        [8, 3],
        [5, 7],
      ],
      DARK,
    );
    g.poly(
      [
        [11, 11],
        [11, 6],
        [8, 11],
      ],
      DARK,
    );
    g.set(9, 4, GLINT);
    g.rect(2, 13, 4, 13, CRACK); // soot under the window
    g.rect(10, 12, 13, 12, CRACK);
  }
  g.rect(2, 12, 13, 12, WL); // sill
}

function tile(name) {
  const g = new Grid(T, T);
  switch (name) {
    case 'roofLeft':
      roof(g, 'left');
      break;
    case 'roofMid':
      roof(g);
      break;
    case 'roofRight':
      roof(g, 'right');
      break;
    case 'wallLeft':
      wall(g, 'left');
      break;
    case 'wallRight':
      wall(g, 'right');
      break;
    case 'wallPlain':
      wall(g);
      g.line(5, 6, 8, 9, CRACK);
      g.line(8, 9, 8, 12, CRACK);
      break;
    case 'windowLit':
      windowTile(g, 'lit');
      break;
    case 'windowDark':
      windowTile(g, 'dark');
      break;
    case 'windowBroken':
      windowTile(g, 'broken');
      break;
    case 'door':
      wall(g);
      g.rect(3, 3, 12, 15, WD);
      g.rect(4, 4, 11, 15, DARK);
      g.rect(5, 5, 10, 8, GLINT);
      g.rect(2, 1, 13, 2, RUST); // awning
      break;
    case 'sign':
      wall(g);
      g.rect(1, 4, 14, 10, K);
      g.rect(2, 5, 13, 9, WD);
      // A small glowing sign: three bars and a dot.
      g.rect(3, 6, 4, 8, NEON);
      g.rect(6, 6, 7, 8, NEON);
      g.rect(9, 6, 10, 8, NEON2);
      g.set(12, 7, NEON);
      break;
    case 'helipad':
      roof(g);
      g.rect(1, 0, 14, 0, PAD); // yellow landing stripe on the roof edge
      g.rect(4, 0, 5, 0, PADW);
      g.rect(10, 0, 11, 0, PADW);
      break;
    case 'acUnit':
      // A roof prop that sits on top of a roof tile (bottom-aligned).
      g.rect(2, 7, 13, 15, LEDGE);
      g.rect(2, 7, 13, 8, ROOF);
      g.rect(4, 10, 11, 13, WD);
      g.line(4, 11, 11, 11, LEDGE);
      g.line(4, 13, 11, 13, LEDGE);
      break;
    case 'antenna':
      g.rect(7, 2, 8, 15, WD);
      g.rect(4, 5, 11, 5, WL);
      g.rect(5, 9, 10, 9, WL);
      g.rect(7, 0, 8, 1, NEON); // warning light
      break;
    case 'rubble':
      g.poly(
        [
          [0, 15],
          [3, 9],
          [7, 11],
          [10, 7],
          [15, 12],
          [15, 15],
        ],
        WD,
      );
      g.poly(
        [
          [2, 15],
          [5, 12],
          [9, 13],
          [12, 11],
          [14, 15],
        ],
        WM,
      );
      g.rect(6, 9, 7, 10, RUST);
      break;
    case 'roofDamaged':
      roof(g);
      g.poly(
        [
          [5, 0],
          [11, 0],
          [9, 4],
          [7, 4],
        ],
        0,
      );
      g.line(7, 5, 6, 9, CRACK);
      break;
  }
  return g
    .outline(K)
    .map((x, y, v) =>
      (name.startsWith('roof') ||
        name.startsWith('wall') ||
        name.startsWith('window') ||
        name === 'door' ||
        name === 'sign' ||
        name === 'helipad') &&
      v === K &&
      !g.get(x, y)
        ? 0
        : v,
    );
}

const dir = process.argv[2] ?? 'tools/art/out';
for (const [key, palette] of Object.entries(PALETTES)) {
  const tiles = TILES.map(tile);
  save(`${dir}/buildings-${key}.png`, sheet(tiles), palette);
  if (process.argv[3] === '--preview') {
    // A sample 5-wide, 4-high building with props, for review only.
    const b = new Grid(T * 6, T * 6);
    const at = (name, x, y) => b.stamp(tiles[TILES.indexOf(name)], x * T, y * T);
    at('antenna', 1, 1);
    at('acUnit', 3, 1);
    at('roofLeft', 0, 2);
    at('roofMid', 1, 2);
    at('helipad', 2, 2);
    at('roofDamaged', 3, 2);
    at('roofRight', 4, 2);
    ['wallLeft', 'windowLit', 'windowDark', 'windowBroken', 'wallRight'].forEach((n, x) =>
      at(n, x, 3),
    );
    ['wallLeft', 'windowDark', 'wallPlain', 'windowLit', 'wallRight'].forEach((n, x) =>
      at(n, x, 4),
    );
    ['wallLeft', 'sign', 'door', 'windowDark', 'wallRight'].forEach((n, x) => at(n, x, 5));
    at('rubble', 5, 5);
    save(`${dir}/preview/building-${key}-x4.png`, b, palette, 4);
  }
}
