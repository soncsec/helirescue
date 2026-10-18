/** All gameplay numbers live here so they can be tuned in one place. */
/**
 * Screen size in game pixels: 16:9, so 1920x1080 is an exact 4x zoom.
 * Approved by the owner on 2026-10-18 (M1 art test).
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** The placeholder player: a box moved with the arrow keys or WASD. */
export const PLAYER = {
  size: 16,
  color: 0x2de2e6,
  /** Pixels per second. */
  speed: 120,
  /** Starting position as a fraction of the screen height. */
  startY: 0.85,
} as const;

/** Seed for the random number generator; override with ?seed= in the URL. */
export const DEFAULT_SEED = 1;

/** Art viewer (?scene=art, from the M1 art test): layout of the two mock scenes and the line-ups. */
export const ART_VIEWER = {
  worldWidth: 960,
  /** Top of the street. */
  groundY: 254,
  tile: 16,
  scrollSpeed: 180,
  /** Parallax: how fast each background layer moves relative to the camera. */
  parallax: { sky: 0.1, far: 0.3, near: 0.6 },
  /** Fill above the background art, matched to its top row. */
  skyColour: { night: 0x281d51, war: 0x19281f },
  streetColour: { night: 0x1a1226, war: 0x26221f },
  streetEdgeColour: { night: 0x3d2a52, war: 0x55504c },
  buildings: [
    { x: 24, width: 7, height: 8, damage: 0.1, helipad: true },
    { x: 176, width: 5, height: 11, damage: 0.3, helipad: false },
    { x: 300, width: 8, height: 6, damage: 0.2, helipad: true },
    { x: 470, width: 6, height: 9, damage: 0.6, helipad: false },
    { x: 600, width: 9, height: 7, damage: 0.1, helipad: true },
    { x: 780, width: 6, height: 12, damage: 0.4, helipad: false },
  ],
  hoverX: 380,
  hoverY: 100,
  hoverBob: 3,
  hoverBobMs: 900,
  civilianWalk: 40,
  civilianWalkMs: 2600,
  soldierWalk: 60,
  soldierWalkMs: 3000,
  tankX: 640,
  tankDrive: 120,
  tankDriveMs: 9000,
  gunshipY: 46,
  gunshipFlyMs: 9000,
  jetY: 70,
  jetFlyMs: 4000,
  jetDelayMs: 3000,
  explosionDelayMs: 900,
  lineup: { margin: 12, gap: 14, labelHeight: 22, top: 28, background: 0x101018 },
  hud: { colour: '#e6ebf2', background: '#000000aa', fontSize: '8px' },
} as const;
