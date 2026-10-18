import Phaser from 'phaser';
import { sheetSpec } from '../config/assets';
import {
  CAMERA,
  DEFAULT_SEED,
  FLIGHT,
  GAME_HEIGHT,
  HEALTH_BAR,
  HELI_SHAPE,
  LANDING,
  LANDING_FX,
  PLAYER,
  SCENERY,
} from '../config/tuning';
import type { Axis, Point } from '../logic/movement';
import {
  newHeli,
  updateHeli,
  type Heli,
  type HeliEvent,
  type HeliMode,
  type HeliRules,
  type HeliWorld,
} from '../logic/landing';
import { createRng } from '../logic/rng';
import type { Roof } from '../logic/world';
import { SKELETON_MAP } from '../missions/skeleton';
import {
  addBackdrop,
  addBuilding,
  addStreet,
  loadArt,
  makeAnims,
  missingArt,
  scrollBackdrop,
  type ParallaxLayer,
} from './scenery';

/** Read-only view of the game state, used by the e2e test hook. */
export interface GameSnapshot {
  player: Point;
  /** Velocity in px/s and tilt in degrees. */
  velocity: Point;
  tilt: number;
  /** 1 facing right, -1 facing left. */
  facing: 1 | -1;
  mode: HeliMode;
  health: number;
  /** The roof (or street) it is landed on, or null. */
  on: Roof | null;
  /** Every event so far except 'none', oldest first (at most 50). */
  events: HeliEvent['kind'][];
  seed: number;
  /** Left edge of the camera view in the world. */
  cameraX: number;
  worldWidth: number;
  roofs: Roof[];
  /** Manifest keys whose texture failed to load. */
  missing: string[];
}

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
  Phaser.Input.Keyboard.Key
>;

const SIDE = sheetSpec('heli-side');
const FRONT = sheetSpec('heli-front');
const RULES: HeliRules = { flight: FLIGHT, landing: LANDING, shape: HELI_SHAPE };
const MAX_EVENTS = 50;

/**
 * The game (roadmap M2 walking skeleton): a wide city with the base at the
 * left end, the camera following the helicopter (H1), arcade flight (H2) and
 * landing rules (H3).
 */
export class GameScene extends Phaser.Scene {
  private sprite!: Phaser.GameObjects.Sprite;
  private boom!: Phaser.GameObjects.Sprite;
  private healthFill!: Phaser.GameObjects.Rectangle;
  private heli!: Heli;
  private world!: HeliWorld;
  private heliEvents: HeliEvent['kind'][] = [];
  private keys!: Keys;
  private seed = DEFAULT_SEED;
  private layers: ParallaxLayer[] = [];
  private roofs: Roof[] = [];
  private readonly map = SKELETON_MAP;

  constructor() {
    super('Game');
  }

  preload(): void {
    loadArt(this);
  }

  create(): void {
    this.seed = seedFromUrl();
    this.heliEvents = [];
    const rng = createRng(this.seed);
    const { theme, width } = this.map;
    const { groundY } = SCENERY;

    this.layers = addBackdrop(this, theme);
    addStreet(this, theme, width);
    const base = addBuilding(this, theme, this.map.base, rng, true);
    const buildings = this.map.buildings.map((b) => addBuilding(this, theme, b, rng));
    this.roofs = [base, ...buildings];

    const spawn = {
      x: (base.left + base.right) / 2,
      y: base.y - HELI_SHAPE.bottom - PLAYER.startAbovePad,
    };
    const halfW = SIDE.frameWidth / 2;
    this.world = {
      surfaces: [...this.roofs, { left: 0, right: width, y: groundY, base: false }],
      buildings: this.roofs,
      groundY,
      people: [],
      bounds: {
        minX: halfW,
        maxX: width - halfW,
        minY: SIDE.frameHeight / 2,
        maxY: groundY - HELI_SHAPE.bottom + LANDING_FX.groundSlack,
      },
      spawn,
    };
    this.heli = newHeli(spawn.x, spawn.y, LANDING);

    makeAnims(this);
    this.sprite = this.add.sprite(spawn.x, spawn.y, SIDE.key).play(SIDE.key);
    this.boom = this.add.sprite(0, 0, 'explosion').setVisible(false);
    this.boom.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.boom.setVisible(false));
    this.addHealthBar();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, GAME_HEIGHT);
    cam.startFollow(this.sprite, true, CAMERA.lerp, CAMERA.lerp);
    this.lookAhead();

    const kb = this.input.keyboard;
    if (!kb) throw new Error('keyboard input is not available');
    this.keys = kb.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      a: 'A',
      s: 'S',
      d: 'D',
    }) as Keys;
  }

  override update(_time: number, deltaMs: number): void {
    const axis = this.readAxis();
    const before = this.heli;
    const { heli, event } = updateHeli(before, axis, deltaMs / 1000, this.world, RULES);
    this.heli = heli;
    if (event.kind !== 'none') this.onEvent(event);
    if (heli.facing !== before.facing) this.lookAhead();
    this.draw(axis);
    scrollBackdrop(this.layers, this.cameras.main.scrollX);
  }

  snapshot(): GameSnapshot {
    const { flight: f } = this.heli;
    return {
      player: { x: f.x, y: f.y },
      velocity: { x: f.vx, y: f.vy },
      tilt: f.tilt,
      facing: this.heli.facing,
      mode: this.heli.mode,
      health: this.heli.health,
      on: this.heli.on ? { ...this.heli.on } : null,
      events: [...this.heliEvents],
      seed: this.seed,
      cameraX: this.cameras.main.scrollX,
      worldWidth: this.map.width,
      roofs: this.roofs.map((r) => ({ ...r })),
      missing: missingArt(this),
    };
  }

  private onEvent(event: HeliEvent): void {
    this.heliEvents.push(event.kind);
    if (this.heliEvents.length > MAX_EVENTS) this.heliEvents.shift();
    const { flight: f } = this.heli;
    if (event.kind === 'hard-landing') {
      this.cameras.main.shake(LANDING_FX.shakeMs, LANDING_FX.shakeStrength);
    } else if (event.kind === 'crashed') {
      this.cameras.main.shake(LANDING_FX.shakeMs * 2, LANDING_FX.shakeStrength * 2);
      this.boom
        .setPosition(f.x, f.y + HELI_SHAPE.bottom)
        .setOrigin(0.5, 1)
        .setVisible(true)
        .play({ key: 'explosion', repeat: 0 });
    }
  }

  /** Shows the side view in flight, the front view when landed, nothing after a crash. */
  private draw(axis: Axis): void {
    const h = this.heli;
    const s = this.sprite;
    s.setVisible(h.mode !== 'crashed');
    const key = h.mode === 'landed' ? FRONT.key : SIDE.key;
    if (s.anims.currentAnim?.key !== key) s.play(key);
    s.setPosition(h.flight.x, h.flight.y)
      .setAngle(h.mode === 'landed' ? 0 : h.flight.tilt)
      .setFlipX(h.mode !== 'landed' && h.facing < 0);
    s.anims.timeScale =
      h.mode === 'landed'
        ? LANDING_FX.rotorLanded
        : axis.y < 0
          ? PLAYER.rotorClimb
          : PLAYER.rotorIdle;
    this.healthFill.width = (HEALTH_BAR.width * h.health) / LANDING.maxHealth;
    this.healthFill.fillColor =
      h.health > HEALTH_BAR.lowAt ? HEALTH_BAR.colour : HEALTH_BAR.lowColour;
  }

  /** A small health bar in the top-left corner (the full HUD comes in M2.4). */
  private addHealthBar(): void {
    const B = HEALTH_BAR;
    this.add
      .rectangle(B.x - 1, B.y - 1, B.width + 2, B.height + 2, B.frame)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.add.rectangle(B.x, B.y, B.width, B.height, B.empty).setOrigin(0, 0).setScrollFactor(0);
    this.healthFill = this.add
      .rectangle(B.x, B.y, B.width, B.height, B.colour)
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  /** Keeps more of the view ahead of the helicopter than behind it. */
  private lookAhead(): void {
    this.cameras.main.setFollowOffset(-CAMERA.lookAhead * this.heli.facing, 0);
  }

  private readAxis(): Axis {
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const up = k.up.isDown || k.w.isDown;
    const down = k.down.isDown || k.s.isDown;
    return {
      x: left === right ? 0 : left ? -1 : 1,
      y: up === down ? 0 : up ? -1 : 1,
    };
  }
}

/** Seed from the URL (?seed=123) for repeatable runs, otherwise the default. */
function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : DEFAULT_SEED;
}
