// Claude-made weapon sprites for HeliRescue (roadmap M3.5).
// Run: node tools/art/weapons.mjs <out-dir> [--preview]
// Writes bullet.png (2 frames, 8x4: a flickering tracer, pointing right),
// bomb.png (1 frame, 8x12: nose down) and spark.png (4 frames, 12x12: a
// bullet hitting a wall). Bomb blasts use the pack's explosion.
import { Grid, sheet, save } from './lib.mjs';

export const PALETTE = [
  '', // 0 transparent
  '#140f1f', // 1 outline
  '#fff6c2', // 2 hot white
  '#ffd23f', // 3 yellow
  '#f0821e', // 4 orange
  '#a8461c', // 5 dark orange
  '#2a2838', // 6 dark metal
  '#4d4f63', // 7 metal
  '#8c90a6', // 8 light metal
];
const [, K, HW, Y, O, OD, D, M, L] = PALETTE.map((_, i) => i);

function bullet(frame) {
  const g = new Grid(8, 4);
  // Tail to head, left to right: orange tail, yellow body, white-hot tip.
  g.rect(0, 1, 1, 2, frame ? O : OD);
  g.rect(2, 1, 4, 2, frame ? Y : O);
  g.rect(5, 1, 7, 2, frame ? HW : Y);
  g.set(7, 0, frame ? Y : 0);
  g.set(7, 3, frame ? Y : 0);
  return g;
}

function bomb() {
  const g = new Grid(8, 12);
  // Fins on top, body, nose at the bottom (it falls nose first).
  g.rect(1, 0, 6, 1, D);
  g.rect(3, 0, 4, 3, D);
  g.ellipse(3.5, 7, 2.6, 4, M);
  g.rect(2, 5, 2, 8, L); // highlight
  g.rect(2, 4, 5, 4, O); // orange band
  return g.outline(K);
}

function spark(frame) {
  const g = new Grid(12, 12);
  const c = 5.5;
  const len = [2, 4, 5, 5][frame] ?? 5;
  const colour = [HW, Y, O, OD][frame] ?? OD;
  // A star: straight rays, plus diagonals after the first frame.
  for (let i = 0; i <= len; i++) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      g.set(Math.round(c + dx * i), Math.round(c + dy * i), i === 0 ? HW : colour);
    }
    if (frame > 0 && i < len - 1) {
      for (const [dx, dy] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        g.set(Math.round(c + dx * i), Math.round(c + dy * i), colour);
      }
    }
  }
  if (frame === 3) {
    // Last frame: just a few embers.
    const embers = new Grid(12, 12);
    for (const [x, y] of [
      [1, 5],
      [10, 6],
      [5, 1],
      [6, 10],
      [2, 2],
      [9, 9],
    ])
      embers.set(x, y, OD);
    return embers;
  }
  return g;
}

const dir = process.argv[2] ?? 'tools/art/out';
save(`${dir}/bullet.png`, sheet([bullet(0), bullet(1)]), PALETTE);
save(`${dir}/bomb.png`, bomb(), PALETTE);
save(`${dir}/spark.png`, sheet([0, 1, 2, 3].map(spark)), PALETTE);
if (process.argv.includes('--preview')) {
  save(`${dir}/preview/bullet-x8.png`, sheet([bullet(0), bullet(1)]), PALETTE, 8);
  save(`${dir}/preview/bomb-x8.png`, bomb(), PALETTE, 8);
  save(`${dir}/preview/spark-x8.png`, sheet([0, 1, 2, 3].map(spark)), PALETTE, 8);
}
