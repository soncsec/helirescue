/** All gameplay numbers live here so they can be tuned in one place. */
/**
 * Screen size in game pixels: 16:9, so 1920x1080 is an exact 4x zoom.
 * Approved by the owner on 2026-10-18 (M1 art test).
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** The helicopter's start and look. */
export const PLAYER = {
  /** How far above the base roof it starts, in pixels. */
  startAbovePad: 30,
  /** Rotor animation speed: 1 = normal, faster while climbing. */
  rotorIdle: 1,
  rotorClimb: 1.6,
} as const;

/**
 * Flight model (H2, src/logic/flight.ts). Top speed = thrust / dragX
 * (about 160 px/s); climb speed = (lift - gravity) / dragY (about 108 px/s);
 * with no input it sinks at gravity / dragY (about 12 px/s).
 */
export const FLIGHT = {
  maxTilt: 12,
  tiltRate: 60,
  thrust: 260,
  dragX: 1.6,
  lift: 300,
  descend: 200,
  gravity: 30,
  dragY: 2.5,
  maxStep: 1 / 120,
} as const;

/**
 * The helicopter's outline around its centre, measured from the side-view
 * sprite (108x48) facing right: skids on the bottom row, 19 px behind to 37 px
 * in front of the centre; the lower body reaches 21 px back and 38 px forward.
 */
export const HELI_SHAPE = {
  bottom: 24,
  skidBack: 19,
  skidFront: 37,
  bodyBack: 21,
  bodyFront: 38,
  bodyHeight: 24,
} as const;

/**
 * Landing rules (H3, src/logic/landing.ts). Sinking with no input (12 px/s) is
 * always safe; a full-speed dive (92 px/s) costs 32 health.
 */
export const LANDING = {
  maxHealth: 100,
  safeSpeed: 40,
  damagePerSpeed: 0.6,
  landingZone: 16,
  respawnSeconds: 2,
} as const;

/** Effects for landings and crashes. */
export const LANDING_FX = {
  /** Camera shake on a hard landing: duration (ms) and strength. */
  shakeMs: 250,
  shakeStrength: 0.01,
  /** Rotor speed while landed. */
  rotorLanded: 0.5,
  /** How far below the street the flight bounds reach, so landings there register their speed. */
  groundSlack: 8,
} as const;

/** Temporary health bar, top-left (the full HUD comes in M2.4). */
export const HEALTH_BAR = {
  x: 6,
  y: 6,
  width: 60,
  height: 4,
  frame: 0x0b0814,
  empty: 0x3a2a44,
  colour: 0x5fd35f,
  lowColour: 0xe0503a,
  /** Turns red at or below this much health. */
  lowAt: 30,
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
