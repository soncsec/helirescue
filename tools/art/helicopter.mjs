// Claude-made rescue helicopter for HeliRescue.
// Run: node tools/art/helicopter.mjs <out-dir>
// Writes heli-side.png (4 rotor frames, facing right, 108x48 each) and
// heli-front.png (4 rotor frames, 80x48 each), plus enlarged previews.
import { Grid, sheet, save } from './lib.mjs';

export const PALETTE = [
  '', // 0 transparent
  '#140f1f', // 1 outline
  '#2a2838', // 2 dark metal
  '#4d4f63', // 3 metal
  '#8c90a6', // 4 light metal
  '#e6ebf2', // 5 white
  '#f0821e', // 6 rescue orange
  '#a8461c', // 7 dark orange
  '#1e5f8c', // 8 canopy shade
  '#3fbfe0', // 9 canopy
  '#c6f6ff', // 10 glint
  '#e03a3c', // 11 red light
  '#ffd23f', // 12 yellow
  '#6b6e85', // 13 rotor blur
  '#bcc2d2', // 14 pale metal
];
const [, K, D, M, L, W, O, OD, CS, C, G, R, Y, B, P] = PALETTE.map((_, i) => i);

const W_SIDE = 108;
const H = 48;

function sideBody() {
  const g = new Grid(W_SIDE, H);
  // Tail boom, tapering to the left.
  g.poly(
    [
      [40, 21],
      [40, 33],
      [10, 29],
      [10, 24],
    ],
    W,
  );
  g.poly(
    [
      [40, 30],
      [40, 33],
      [10, 29],
      [10, 28],
    ],
    P,
  );
  g.poly(
    [
      [40, 26],
      [40, 28],
      [10, 26],
      [10, 25],
    ],
    O,
  );
  // Tail fin with a darker leading edge.
  g.poly(
    [
      [3, 8],
      [12, 8],
      [19, 27],
      [6, 28],
    ],
    O,
  );
  g.poly(
    [
      [3, 8],
      [6, 8],
      [9, 28],
      [6, 28],
    ],
    OD,
  );
  g.rect(14, 29, 18, 31, D); // tail skid
  // Cabin body with shading bands.
  const cx = 62;
  const cy = 30;
  g.ellipse(cx, cy, 29, 13, W);
  g.ellipse(cx, cy, 29, 13, P, (x, y) => y >= 37);
  g.ellipse(cx, cy, 29, 13, L, (x, y) => y >= 40);
  g.ellipse(cx, cy, 29, 13, O, (x, y) => y >= 32 && y <= 34);
  g.ellipse(cx, cy, 29, 13, OD, (x, y) => y === 35);
  // Canopy on the nose, shaded at the bottom, with glints.
  g.ellipse(cx, cy, 29, 13, C, (x, y) => x >= 74 && y <= 30);
  g.ellipse(cx, cy, 29, 13, CS, (x, y) => x >= 74 && y >= 28 && y <= 30);
  g.line(74, 18, 74, 30, CS);
  g.line(80, 20, 85, 25, G);
  g.line(81, 20, 86, 25, G);
  g.line(78, 21, 79, 22, G);
  // Side door, where people climb aboard.
  g.rect(46, 20, 62, 39, D);
  g.rect(47, 21, 61, 38, M);
  g.rect(49, 23, 59, 29, CS);
  g.rect(49, 23, 51, 24, C);
  g.rect(58, 33, 60, 33, P); // handle
  g.line(46, 31, 62, 31, D);
  // Small rear window.
  g.rect(37, 24, 41, 27, CS);
  g.set(37, 24, C);
  // Engine housing with intake, exhaust and panel line.
  g.rect(44, 12, 76, 19, P);
  g.rect(45, 11, 75, 11, P);
  g.rect(45, 12, 75, 13, W);
  g.rect(68, 14, 73, 17, D);
  g.rect(69, 15, 72, 16, M);
  g.rect(40, 14, 44, 17, D);
  g.rect(41, 15, 42, 16, M);
  g.line(56, 12, 56, 19, L);
  // Rotor mast.
  g.rect(58, 5, 61, 10, D);
  g.rect(59, 6, 60, 9, M);
  // Skids and struts.
  g.rect(36, 46, 88, 46, M);
  g.rect(36, 45, 88, 45, L);
  g.rect(89, 44, 90, 45, M);
  g.rect(45, 42, 46, 44, D);
  g.rect(77, 42, 78, 44, D);
  // Lights: beacon, tail light, searchlight under the nose.
  g.rect(50, 10, 51, 10, R);
  g.set(4, 9, R);
  g.rect(84, 40, 86, 41, Y);
  return g;
}

/** Main rotor seen from the side: the blade appears to shorten as it turns. */
function mainRotor(frame) {
  const g = new Grid(W_SIDE, H);
  const half = [54, 36, 12, 36][frame];
  const c = frame === 0 ? M : B;
  g.line(60 - half, 3, 59 + half, 3, c);
  if (frame === 0) g.line(60 - half, 4, 59 + half, 4, D);
  g.rect(55, 3, 64, 4, D);
  return g;
}

/** Tail rotor: four poses of a short blade. */
function tailRotor(frame) {
  const g = new Grid(W_SIDE, H);
  const cx = 11;
  const cy = 18;
  const r = 7;
  const poses = [
    [-r, 0],
    [-5, -5],
    [0, -r],
    [-5, 5],
  ][frame];
  g.line(cx + poses[0], cy + poses[1], cx - poses[0], cy - poses[1], B);
  g.rect(cx - 1, cy - 1, cx, cy, D);
  return g;
}

export function sideFrames() {
  return [0, 1, 2, 3].map((f) => {
    const g = sideBody().outline(K);
    // Rotors go on after the outline so they stay thin.
    g.stamp(tailRotor(f), 0, 0);
    g.stamp(mainRotor(f), 0, 0);
    return g;
  });
}

const W_FRONT = 80;

/** Facing the camera, used while landed and when turning (as in Choplifter). */
export function frontFrames() {
  return [0, 1, 2, 3].map((f) => {
    const g = new Grid(W_FRONT, H);
    const cx = 40;
    const cy = 30;
    g.ellipse(cx, cy, 17, 13, W);
    g.ellipse(cx, cy, 17, 13, P, (x, y) => y >= 37);
    g.ellipse(cx, cy, 17, 13, L, (x, y) => y >= 40);
    g.ellipse(cx, cy, 17, 13, O, (x, y) => y >= 32 && y <= 34);
    g.ellipse(cx, cy, 17, 13, OD, (x, y) => y === 35);
    // Two-pane windscreen.
    g.ellipse(cx, 27, 12, 9, C, (x, y) => y <= 30);
    g.ellipse(cx, 27, 12, 9, CS, (x, y) => y >= 29 && y <= 30);
    g.line(cx, 18, cx, 30, CS);
    g.line(cx - 1, 18, cx - 1, 30, CS);
    g.line(31, 22, 34, 19, G);
    g.line(32, 23, 35, 20, G);
    // Engine housing and mast.
    g.rect(28, 12, 51, 17, P);
    g.rect(29, 12, 50, 13, W);
    g.rect(38, 5, 41, 11, D);
    // Struts and skids.
    g.line(27, 41, 23, 46, D);
    g.line(52, 41, 56, 46, D);
    g.rect(16, 46, 27, 46, M);
    g.rect(52, 46, 63, 46, M);
    // Lights.
    g.rect(24, 31, 25, 32, Y);
    g.rect(54, 31, 55, 32, Y);
    g.rect(39, 39, 40, 40, Y);
    const out = g.outline(K);
    const half = [38, 26, 8, 26][f];
    out.line(40 - half, 3, 39 + half, 3, f === 0 ? M : B);
    if (f === 0) out.line(40 - half, 4, 39 + half, 4, D);
    out.rect(36, 3, 43, 4, D);
    return out;
  });
}

const dir = process.argv[2] ?? 'tools/art/out';
save(`${dir}/heli-side.png`, sheet(sideFrames()), PALETTE);
save(`${dir}/heli-front.png`, sheet(frontFrames()), PALETTE);
if (process.argv[3] === '--preview') {
  save(`${dir}/preview/heli-side-x4.png`, sheet(sideFrames().slice(0, 2)), PALETTE, 4);
  save(`${dir}/preview/heli-front-x4.png`, sheet(frontFrames().slice(0, 2)), PALETTE, 4);
}
