// Claude-made rescue base for HeliRescue: a low building with a big H landing
// pad on its roof, a hut people walk into, a beacon and a waving flag.
// Run: node tools/art/base.mjs <out-dir>
// Writes base.png: 2 frames (flag waving) of 160x96. The roof surface's
// middle is row 48, so the game draws the sprite's bottom on the street and
// the landing surface is 48 px above it.
import { Grid, sheet, save } from './lib.mjs';

export const PALETTE = [
  '', // 0 transparent
  '#140f1f', // 1 outline
  '#33405a', // 2 wall dark
  '#4a5a78', // 3 wall
  '#6d7fa0', // 4 wall light
  '#2a3346', // 5 roof surface
  '#8d9bb8', // 6 roof edge
  '#f0821e', // 7 rescue orange
  '#a8461c', // 8 dark orange
  '#e6ebf2', // 9 white
  '#ffd23f', // 10 yellow
  '#ffb347', // 11 lit window
  '#1a2340', // 12 dark window
  '#e03a3c', // 13 red
  '#bcc2d2', // 14 pole
  '#1b2130', // 15 door
];
const [, K, WD, WA, WL, RS, RE, O, OD, WH, Y, LIT, DW, R, PL, DR] = PALETTE.map((_, i) => i);

const W = 160;
const H = 96;
/** Middle of the roof surface: where the helicopter's skids rest. */
export const PAD_ROW = 48;
/** Middle of the hut door (local x): rescued people walk in here. */
export const HUT_DOOR_X = 30;

function building() {
  const g = new Grid(W, H);

  // Front wall.
  g.rect(0, 52, W - 1, H - 1, WA);
  g.rect(0, 52, W - 1, 53, WL); // ledge
  g.rect(0, H - 3, W - 1, H - 1, WD); // foot
  // Rescue stripes.
  for (let x = 0; x < W; x++) {
    for (let y = 56; y <= 61; y++) g.set(x, y, Math.floor((x + y) / 4) % 2 ? O : WH);
  }
  g.rect(0, 62, W - 1, 62, OD);
  // Windows.
  for (const x of [44, 58, 72]) {
    g.rect(x, 67, x + 8, 74, LIT);
    g.rect(x, 67, x + 8, 67, Y);
    g.rect(x + 4, 67, x + 4, 74, WD);
  }
  // Rescue emblem: white cross on orange.
  g.rect(14, 67, 32, 85, O);
  g.rect(21, 70, 25, 82, WH);
  g.rect(17, 74, 29, 78, WH);
  // Garage door with a rolling shutter.
  g.rect(98, 70, 146, H - 1, WD);
  for (let y = 72; y < H; y += 3) g.rect(100, y, 144, y, WL);
  g.rect(98, 70, 146, 70, OD);

  // Roof surface, seen slightly from above.
  g.rect(0, 44, W - 1, 51, RS);
  g.rect(0, 44, W - 1, 44, RE);
  g.rect(0, 51, W - 1, 51, RE);
  // Helipad: yellow ring and a white H, squashed by the viewing angle.
  const cx = 80;
  g.ellipse(cx, 48, 34, 3.6, Y);
  g.ellipse(cx, 48, 30, 2.4, RS);
  g.rect(cx - 9, 46, cx - 7, 50, WH);
  g.rect(cx + 7, 46, cx + 9, 50, WH);
  g.rect(cx - 7, 48, cx + 7, 48, WH);
  // Edge lights.
  for (const x of [2, W - 3]) g.set(x, 47, Y);

  // Hut people walk into.
  g.rect(4, 22, 40, 47, WL);
  g.rect(4, 20, 42, 22, RE); // roof slab
  g.rect(4, 23, 40, 25, O); // orange band
  g.rect(8, 29, 18, 35, DW); // window
  g.rect(8, 29, 18, 29, WL);
  g.rect(HUT_DOOR_X - 4, 31, HUT_DOOR_X + 4, 47, DR); // door
  g.rect(HUT_DOOR_X - 5, 30, HUT_DOOR_X + 5, 30, WD);
  g.set(HUT_DOOR_X + 3, 40, Y); // handle

  // Beacon on the hut roof.
  g.rect(36, 15, 36, 19, PL);
  g.rect(35, 13, 37, 14, R);
  return g;
}

function flag(frame) {
  const g = new Grid(W, H);
  g.rect(10, 0, 10, 19, PL); // pole
  g.set(10, 0, WH);
  // A two-frame wave: the fly end lifts and drops.
  for (let x = 11; x <= 27; x++) {
    const wave = Math.round(Math.sin((x - 11) / 3 + frame * Math.PI) * (x - 11) * 0.12);
    for (let y = 3; y <= 11; y++) g.set(x, y + wave, y >= 6 && y <= 8 ? WH : O);
  }
  return g;
}

function frameAt(i) {
  const g = building();
  g.stamp(flag(i), 0, 0);
  return g.outline(K);
}

const dir = process.argv[2] ?? 'tools/art/out';
save(`${dir}/base.png`, sheet([frameAt(0), frameAt(1)]), PALETTE);
if (process.argv.includes('--preview')) {
  save(`${dir}/preview/base-x4.png`, frameAt(0), PALETTE, 4);
}
