/** All gameplay numbers live here so they can be tuned in one place. */
/**
 * Screen size in game pixels: 16:9, so 1920x1080 is an exact 4x zoom.
 * Approved by the owner on 2026-10-18 (M1 art test).
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/**
 * The helicopter. Until the flight model (M2.2) it moves at a steady speed
 * with the arrow keys or WASD.
 */
export const PLAYER = {
  /** Pixels per second. */
  speed: 120,
  /** How far above the base roof it starts, in pixels. */
  startAbovePad: 30,
} as const;

/** Shared look of the city: street, background layers and building tiles. */
export const SCENERY = {
  /** Top of the street. */
  groundY: 254,
  tile: 16,
  /** Parallax: how fast each background layer moves relative to the camera. */
  parallax: { sky: 0.1, far: 0.3, near: 0.6 },
  /** Fill above the background art, matched to its top row. */
  skyColour: { night: 0x281d51, war: 0x19281f },
  streetColour: { night: 0x1a1226, war: 0x26221f },
  streetEdgeColour: { night: 0x3d2a52, war: 0x55504c },
} as const;

/** Rules every mission map must follow (checked by a unit test). */
export const WORLD_LIMITS = {
  tile: SCENERY.tile,
  groundY: SCENERY.groundY,
  /** At least one screen wide. */
  minWidth: 480,
  /** Clear sky above the tallest roof: the helicopter (48 px) plus room to fly. */
  minSky: 80,
} as const;

/** Camera follow (H1). */
export const CAMERA = {
  /** 0..1: how quickly the camera catches up with the helicopter (1 = at once). */
  lerp: 0.12,
  /** How far ahead of the helicopter the camera looks, in pixels. */
  lookAhead: 60,
} as const;

/** Seed for the random number generator; override with ?seed= in the URL. */
export const DEFAULT_SEED = 1;

/** Art viewer (?scene=art, from the M1 art test): layout of the two mock scenes and the line-ups. */
export const ART_VIEWER = {
  ...SCENERY,
  worldWidth: 960,
  scrollSpeed: 180,
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
