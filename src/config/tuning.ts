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

/**
 * People to rescue (H3, src/logic/people.ts). The civilian sprite is 32x32
 * with the feet on the bottom row; the figure is about 26 px tall, 12 px wide.
 */
export const PEOPLE = {
  runSpeed: 40,
  walkSpeed: 30,
  boardReach: 4,
  boardSeconds: 0.3,
  capacity: 10,
  /** Space between people standing in a group on a roof, px. */
  groupGap: 12,
  unloadGap: 0.6,
  height: 26,
  halfWidth: 6,
} as const;

/**
 * Points (scope: points per person saved and a mission bonus; no penalties).
 * The bonus is scaled by the share of people saved (owner, 2026-10-18), so
 * letting people be lost never ends a mission at no cost. First values, to
 * tune after the owner's play-test.
 */
export const SCORING = {
  perPerson: 100,
  missionBonus: 1000,
  perfectBonus: 500,
} as const;

/**
 * Forward gun and bombs (roadmap M3.5, src/logic/weapons.ts). First values,
 * to tune after the owner's play-test.
 */
export const WEAPONS = {
  /** Bullets: just over a screen of range (360 px/s for 1.4 s, about 500 px). */
  bulletSpeed: 360,
  bulletLife: 1.4,
  /** About 6 shots a second while Fire is held. */
  fireEvery: 0.16,
  /** The nose of the side-view sprite (108x48), from its centre. */
  noseX: 40,
  noseY: 6,
  maxBullets: 12,
  bombGravity: 420,
  bombEvery: 0.6,
  maxBombs: 3,
  /** Between the skids, just under the body. */
  dropY: 20,
  /** A bomb hits people within this distance of the blast (friendly fire, owner 2026-10-19). */
  peopleBlastRadius: 28,
  hitStep: 4,
} as const;

/**
 * Enemies (roadmap M3.6, src/logic/enemies.ts). First values, to tune after the
 * owner's play-test: about 7 flak hits crash the helicopter.
 */
export const ENEMIES = {
  aaRange: 200,
  aaReloadMin: 2,
  aaReloadMax: 3,
  /** A short grace period before a gun's first shot. */
  firstShot: 1.5,
  aaHp: 3,
  /** Hit box of the turret sprite (50x32, drawn standing on the roof). */
  gunHalfWidth: 18,
  gunHeight: 24,
  muzzleY: 22,
  flakSpeed: 150,
  flakLife: 2,
  flakDamage: 15,
  maxFlak: 8,
  /** About the helicopter's body, smaller than the sprite so near misses miss. */
  heliHalfWidth: 26,
  heliHalfHeight: 12,
  hitStep: 4,
  /** A bomb destroys a gun whose hit box is within this distance of the blast. */
  blastRadius: 24,
} as const;

/**
 * Soldiers (roadmap M3.6, src/logic/soldiers.ts). First values, to tune after
 * the owner's play-test. The soldier sprite is 75x48 with the feet on the
 * bottom row and the rifle about 20 px in front.
 */
export const SOLDIERS = {
  walkSpeed: 18,
  range: 180,
  reloadMin: 1.4,
  reloadMax: 2.4,
  firstShot: 1,
  shootPose: 0.3,
  muzzleX: 22,
  muzzleY: 26,
  shotSpeed: 170,
  shotLife: 1.6,
  maxShots: 6,
  halfWidth: 9,
  height: 34,
  /** Matches PEOPLE (12 px wide, 26 tall). */
  personHalfWidth: PEOPLE.halfWidth,
  personHeight: PEOPLE.height,
  downSeconds: 0.6,
  hitStep: 4,
  /** A bomb takes down soldiers within this distance of the blast. */
  blastRadius: 28,
  /** Sprite frames (first, last) in soldier.png: run, shoot, fall. */
  frames: { run: [0, 9], shoot: [10, 11], down: [12, 14] },
  /** Their shots reuse the bullet sprite, tinted red. */
  shotTint: 0xff6a5a,
} as const;

/** Pooled effect sprites: spark per bullet impact, explosion per bomb blast. */
export const EFFECTS = {
  sparks: 8,
  blasts: 4,
  /** Small puffs where flak bursts. */
  bursts: 6,
  /** Camera shake when a bomb goes off: duration (ms) and strength. */
  blastShakeMs: 120,
  blastShake: 0.004,
} as const;

/** Helicopters per mission (scope, owner 2026-10-18; src/logic/lives.ts). */
export const LIVES = {
  perMission: 3,
  /**
   * After the last crash, how long the wreck shows before the game-over
   * screen: longer than a respawn takes, so it is plain that none comes.
   */
  gameOverSeconds: 2.5,
} as const;

/** Saved data checks (H9, src/logic/save.ts). */
export const SAVE = {
  /** Highest believable score; a stored value above it counts as corrupt. */
  maxScore: 9_999_999,
  missions: 5,
} as const;

/** Result screen at the end of a mission (src/scenes/ResultScene.ts), in game pixels. */
export const RESULT = {
  /** Dark panel in the middle of the screen. */
  panelWidth: 300,
  panelHeight: 200,
  panelColour: 0x140f1f,
  panelAlpha: 0.92,
  border: 0xf0821e,
  /** GAME OVER title colour. */
  danger: '#e0503a',
  /** Text rows: first row's top, row spacing, and the label and number columns. */
  top: 50,
  row: 16,
  labelX: 110,
  valueRight: 370,
} as const;

/** The base sprite (tools/art/base.mjs): 160x96, roof surface 48 px above the street. */
export const BASE_ART = {
  /** Hut door, from the sprite's left edge: rescued people walk in here. */
  hutDoorX: 30,
} as const;

/**
 * Heads-up display along the top of the screen. The bottom corners stay clear
 * for the touch controls (M2.5).
 */
export const HUD = {
  /** Press Start 2P (OFL, bundled; approved 2026-10-18), drawn at its native 8 px. */
  font: '"Press Start 2P", monospace',
  fontSize: 8,
  colour: '#e6ebf2',
  accent: '#ffd23f',
  shadow: '#140f1f',
  /** Top-left health bar. */
  bar: {
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
  },
  /**
   * Text row: top edge, and where SAVED, ABOARD and SCORE start. The font is
   * 8 px per character: "SAVED 16/16" ends at 168, so ABOARD starts after a gap.
   */
  textY: 4,
  savedX: 80,
  aboardX: 184,
  /** Helicopters left: under the health bar. */
  livesX: 6,
  livesY: 14,
  scoreRight: 474,
  /** "+100" popup when someone is saved: rise (px) and duration (ms). */
  popupRise: 18,
  popupMs: 900,
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
  /** People stand at least this far in from a roof edge. */
  personMargin: 8,
  /**
   * A roof with people keeps a stretch this wide clear of them, so the
   * helicopter can land beside the group facing either way (the skids reach
   * further in front than behind, and facing flips the span), plus 32 px so
   * landing there is not fiddly.
   */
  landingRoom: 2 * Math.max(HELI_SHAPE.skidBack, HELI_SHAPE.skidFront) + 32,
  /** How much of the roof one person takes up either side of their x. */
  personHalfWidth: PEOPLE.halfWidth,
} as const;

/** Camera follow (H1). */
/**
 * Touch D-pad (roadmap M2.6, src/logic/touch.ts): bottom-left corner, in game
 * pixels. Shown on touch-only devices or with ?touch=1.
 */
export const TOUCH = {
  padX: 52,
  padY: GAME_HEIGHT - 52,
  radius: 40,
  deadZone: 7,
  grab: 1.3,
  /** Arrow centre distance from the pad centre, and half the arrow's size. */
  arrow: 22,
  arrowSize: 7,
  fill: 0x140f1f,
  line: 0xf0821e,
  pressed: 0xffd23f,
  alpha: 0.55,
  /** Pause button: top right, under the score; centre and half its size. */
  pauseX: GAME_WIDTH - 18,
  pauseY: 30,
  pauseHalf: 10,
  /**
   * Round buttons for the right thumb (scope: Fire, Bomb and Turn), centre and
   * radius. Fire is the biggest, in the corner; Bomb to its left; Turn above.
   */
  buttons: {
    fire: { x: GAME_WIDTH - 44, y: GAME_HEIGHT - 48, r: 28, label: 'FIRE' },
    bomb: { x: GAME_WIDTH - 108, y: GAME_HEIGHT - 34, r: 20, label: 'BOMB' },
    turn: { x: GAME_WIDTH - 40, y: GAME_HEIGHT - 114, r: 20, label: 'TURN' },
  },
} as const;

/** Title screen (src/scenes/TitleScene.ts), in game pixels. */
export const TITLE = {
  /** The game's name, drawn at twice the HUD font size (a whole-number scale). */
  nameY: 26,
  nameSize: 16,
  taglineY: 56,
  /** Controls table: first row, row spacing, key column and action column. */
  controlsY: 92,
  row: 14,
  keyX: 120,
  actionX: 290,
  highY: 176,
  startY: 196,
  /** The CREDITS prompt (keyboard) or button (touch) along the bottom. */
  creditY: 246,
  creditButtonWidth: 96,
  creditButtonHeight: 18,
  /** Start prompt blink, ms. */
  blinkMs: 600,
  /** Dark panel behind the controls, high score and start prompt, so they read over the city. */
  panelTop: 82,
  panelBottom: 212,
  panelWidth: 300,
  panelAlpha: 0.8,
} as const;

/** Credits screen (src/scenes/CreditsScene.ts), in game pixels. */
export const CREDITS_SCREEN = {
  top: 14,
  left: 16,
  row: 12,
  /** Extra space after the title and between sections. */
  gap: 6,
  /** The "go back" prompt, up from the bottom. */
  bottom: 18,
  /** Longest line that fits: 480 px less the margins, at 8 px per character. */
  maxChars: 56,
} as const;

/** Pause panel (src/scenes/PauseScene.ts), in game pixels. */
export const PAUSE = {
  panelWidth: 240,
  panelHeight: 72,
} as const;

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
