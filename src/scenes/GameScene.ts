import Phaser from 'phaser';
import { sheetSpec } from '../config/assets';
import { CAMERA, DEFAULT_SEED, FLIGHT, GAME_HEIGHT, PLAYER, SCENERY } from '../config/tuning';
import { fly, hovering, type FlightState } from '../logic/flight';
import type { Axis, Bounds, Point } from '../logic/movement';
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

const HELI = sheetSpec('heli-side');

/**
 * The game (roadmap M2 walking skeleton): a wide city with the base at the
 * left end, the camera following the helicopter (H1) and arcade flight (H2).
 * Landing rules (M2.3) come next.
 */
export class GameScene extends Phaser.Scene {
  private heli!: Phaser.GameObjects.Sprite;
  private flight: FlightState = hovering(0, 0);
  private facing: 1 | -1 = 1;
  private keys!: Keys;
  private seed = DEFAULT_SEED;
  private layers: ParallaxLayer[] = [];
  private roofs: Roof[] = [];
  private bounds!: Bounds;
  private readonly map = SKELETON_MAP;

  constructor() {
    super('Game');
  }

  preload(): void {
    loadArt(this);
  }

  create(): void {
    this.seed = seedFromUrl();
    const rng = createRng(this.seed);
    const { theme, width } = this.map;

    this.layers = addBackdrop(this, theme);
    addStreet(this, theme, width);
    const base = addBuilding(this, theme, this.map.base, rng, true);
    this.roofs = [base, ...this.map.buildings.map((b) => addBuilding(this, theme, b, rng))];

    makeAnims(this);
    const halfW = HELI.frameWidth / 2;
    const halfH = HELI.frameHeight / 2;
    this.bounds = { minX: halfW, maxX: width - halfW, minY: halfH, maxY: SCENERY.groundY - halfH };
    this.flight = hovering((base.left + base.right) / 2, base.y - halfH - PLAYER.startAbovePad);
    this.heli = this.add.sprite(this.flight.x, this.flight.y, HELI.key).play(HELI.key);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, GAME_HEIGHT);
    cam.startFollow(this.heli, true, CAMERA.lerp, CAMERA.lerp);
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
    this.flight = fly(this.flight, axis, deltaMs / 1000, FLIGHT, this.bounds);
    if (axis.x !== 0 && axis.x !== this.facing) {
      this.facing = axis.x;
      this.heli.setFlipX(this.facing < 0);
      this.lookAhead();
    }
    const f = this.flight;
    this.heli.setPosition(f.x, f.y).setAngle(f.tilt);
    this.heli.anims.timeScale = axis.y < 0 ? PLAYER.rotorClimb : PLAYER.rotorIdle;
    scrollBackdrop(this.layers, this.cameras.main.scrollX);
  }

  snapshot(): GameSnapshot {
    return {
      player: { x: this.flight.x, y: this.flight.y },
      velocity: { x: this.flight.vx, y: this.flight.vy },
      tilt: this.flight.tilt,
      facing: this.facing,
      seed: this.seed,
      cameraX: this.cameras.main.scrollX,
      worldWidth: this.map.width,
      roofs: this.roofs.map((r) => ({ ...r })),
      missing: missingArt(this),
    };
  }

  /** Keeps more of the view ahead of the helicopter than behind it. */
  private lookAhead(): void {
    this.cameras.main.setFollowOffset(-CAMERA.lookAhead * this.facing, 0);
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
