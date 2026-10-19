import Phaser from 'phaser';
import { sheetSpec } from '../config/assets';
import {
  BASE_ART,
  CAMERA,
  DEFAULT_SEED,
  FLIGHT,
  GAME_HEIGHT,
  HELI_SHAPE,
  HUD,
  LANDING,
  LANDING_FX,
  LIVES,
  PEOPLE,
  PLAYER,
  SAVE,
  SCENERY,
  SCORING,
  WORLD_LIMITS,
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
import {
  blockers,
  tally,
  updatePeople,
  visible,
  waitingOn,
  type Person,
  type PeopleEvent,
} from '../logic/people';
import { wantsTouch } from '../logic/device';
import { createRng } from '../logic/rng';
import type { TouchState } from '../logic/touch';
import { afterCrash } from '../logic/lives';
import { gameOverResult, missionOver, missionResult, rescueScore } from '../logic/score';
import { recordScore } from '../logic/save';
import { roofOf, roofUnder, type Roof } from '../logic/world';
import { MISSION_1 } from '../missions/mission1';
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
import type { HudState } from './HudScene';
import type { ResultData } from './ResultScene';
import { loadSave, storeSave } from './storage';

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
  /** Every helicopter and people event so far, oldest first (at most 50). */
  events: (HeliEvent['kind'] | PeopleEvent['kind'])[];
  people: { id: number; mode: Person['mode']; x: number; y: number }[];
  hud: HudState;
  seed: number;
  /** Touch controls on, the D-pad's current axis, and the canvas zoom. */
  input: { touch: boolean; touchAxis: Axis; zoom: number };
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
const CIVILIANS = ['civilian-blue', 'civilian-green', 'civilian-yellow'] as const;
const FRONT = sheetSpec('heli-front');
const RULES: HeliRules = { flight: FLIGHT, landing: LANDING, shape: HELI_SHAPE };
const MAX_EVENTS = 50;

/**
 * The game (mission 1 from roadmap M3.1): a wide city with the base at the
 * left end, the camera following the helicopter (H1), arcade flight (H2),
 * landing rules and the rescue loop (H3): people board on their roof and are
 * saved when unloaded at base. The HUD runs in its own scene (HudScene).
 */
export class GameScene extends Phaser.Scene {
  private sprite!: Phaser.GameObjects.Sprite;
  private boom!: Phaser.GameObjects.Sprite;
  private heli!: Heli;
  private world!: HeliWorld;
  private people: Person[] = [];
  private personSprites: Phaser.GameObjects.Sprite[] = [];
  private hutDoorX = 0;
  private heliEvents: GameSnapshot['events'] = [];
  private keys!: Keys;
  /** C was pressed since the last frame. */
  private turnPressed = false;
  /** Written by the HUD scene's D-pad; null on keyboard devices. */
  private touch: TouchState | null = null;
  /** True once the mission has ended and the result screen is up. */
  private over = false;
  /** Helicopters left, including the one flying. */
  private lives: number = LIVES.perMission;
  /** Seconds since the last helicopter crashed; null while any are left. */
  private wreckedFor: number | null = null;
  private seed = DEFAULT_SEED;
  private layers: ParallaxLayer[] = [];
  private roofs: Roof[] = [];
  private readonly map = MISSION_1;

  constructor() {
    super('Game');
  }

  preload(): void {
    loadArt(this);
  }

  create(): void {
    this.seed = seedFromUrl();
    this.heliEvents = [];
    this.over = false;
    this.lives = LIVES.perMission;
    this.wreckedFor = null;
    const rng = createRng(this.seed);
    const { theme, width } = this.map;
    const { groundY } = SCENERY;

    this.layers = addBackdrop(this, theme);
    addStreet(this, theme, width);
    const base = roofOf(this.map.base, SCENERY, true);
    const buildings = this.map.buildings.map((b) => addBuilding(this, theme, b, rng));
    this.roofs = [base, ...buildings];
    makeAnims(this);
    this.add.sprite(base.left, groundY, 'base').setOrigin(0, 1).play('base');
    this.hutDoorX = base.left + BASE_ART.hutDoorX;

    this.people = this.map.people.map((p, id) => {
      const roof = roofUnder(this.map, p.x, WORLD_LIMITS);
      if (!roof) throw new Error(`person ${id} is not on a roof`);
      return waitingOn(id, p.x, roof);
    });
    this.personSprites = this.people.map(
      (p) =>
        this.add
          .sprite(p.x, p.y, CIVILIANS[p.id % CIVILIANS.length] ?? 'civilian-blue', 0)
          .setOrigin(0.5, 1)
          .setDepth(1), // in front of the helicopter
    );

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

    this.sprite = this.add.sprite(spawn.x, spawn.y, SIDE.key).play(SIDE.key);
    this.boom = this.add.sprite(0, 0, 'explosion').setVisible(false);
    this.boom.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.boom.setVisible(false));
    this.touch = wantsTouch(window.location.search, (q) => window.matchMedia(q).matches)
      ? { axis: { x: 0, y: 0 }, pause: false, turn: false }
      : null;
    this.scene.launch('Hud', { read: (): HudState | null => this.hudState(), touch: this.touch });

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
    // A press is recorded as it happens: a quick tap can come and go between
    // frames, which Phaser's JustDown would miss.
    this.turnPressed = false;
    kb.on('keydown-C', () => {
      this.turnPressed = true;
    });
    kb.on('keydown-P', () => this.pauseGame());
    kb.on('keydown-ESC', () => this.pauseGame());

    // Pause when the tab or app loses focus (owner, 2026-10-18), so nothing
    // happens to the helicopter while the player is away.
    const away = (): void => this.pauseGame();
    const hidden = (): void => {
      if (document.visibilityState === 'hidden') this.pauseGame();
    };
    window.addEventListener('blur', away);
    document.addEventListener('visibilitychange', hidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', away);
      document.removeEventListener('visibilitychange', hidden);
    });
  }

  /** Opens the pause screen over the frozen game (not after the mission has ended). */
  pauseGame(): void {
    if (this.over || !this.scene.isActive()) return;
    if (this.touch) this.touch.pause = false;
    this.scene.launch('Pause', { touch: this.touch !== null });
    this.scene.pause();
  }

  override update(_time: number, deltaMs: number): void {
    if (this.touch?.pause) {
      this.pauseGame();
      return;
    }
    const axis = this.readAxis();
    const before = this.heli;
    const dt = deltaMs / 1000;
    this.world = { ...this.world, people: blockers(this.people, PEOPLE) };
    // With no helicopters left the wreck stays down: no respawn.
    const turn = this.readTurn();
    const { heli, event } =
      this.wreckedFor === null
        ? updateHeli(before, axis, dt, this.world, RULES, turn)
        : { heli: before, event: { kind: 'none' } as const };
    this.heli = heli;
    if (event.kind !== 'none') this.onEvent(event);
    const moved = updatePeople(this.people, heli, dt, this.hutDoorX, PEOPLE);
    this.people = moved.people;
    for (const e of moved.events) this.onPeopleEvent(e);
    this.drawPeople();
    if (!this.over && missionOver(tally(this.people))) this.endMission('complete');
    if (!this.over && this.wreckedFor !== null) {
      this.wreckedFor += dt;
      if (this.wreckedFor >= LIVES.gameOverSeconds) this.endMission('gameover');
    }
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
      people: this.people.map((p) => ({ id: p.id, mode: p.mode, x: p.x, y: p.y })),
      hud: this.hudState(),
      seed: this.seed,
      input: {
        touch: this.touch !== null,
        touchAxis: { ...(this.touch?.axis ?? { x: 0, y: 0 }) },
        zoom: this.scale.zoom,
      },
      cameraX: this.cameras.main.scrollX,
      worldWidth: this.map.width,
      roofs: this.roofs.map((r) => ({ ...r })),
      missing: missingArt(this),
    };
  }

  hudState(): HudState {
    const t = tally(this.people);
    return {
      health: this.heli.health,
      maxHealth: LANDING.maxHealth,
      saved: t.saved,
      total: t.total,
      aboard: t.aboard,
      capacity: PEOPLE.capacity,
      score: rescueScore(t.saved, SCORING),
      lives: this.lives,
    };
  }

  /**
   * Test hook only (e2e build): settles the mission as if `saved` people were
   * rescued and `lost` were lost, so the result screen can be tested without
   * flying every trip. Not reachable in the player build.
   */
  settleForTest(saved: number, lost: number): void {
    this.people = this.people.map((p, i) =>
      i < saved
        ? { ...p, mode: 'saved', roof: null }
        : i < saved + lost
          ? { ...p, mode: 'lost', roof: null }
          : p,
    );
  }

  /**
   * Test hook only (e2e build): crashes the helicopter where it is, through
   * the same path as a real crash, so lives and game over can be tested
   * without diving into roofs. Not reachable in the player build.
   */
  crashForTest(): void {
    if (this.heli.mode === 'crashed') return;
    this.heli = { ...this.heli, mode: 'crashed', health: 0, on: null, crashedFor: 0 };
    this.onEvent({ kind: 'crashed' });
  }

  /**
   * The mission is over: everyone saved or lost ('complete'), or no
   * helicopters left ('gameover'). Freeze the game and show the result.
   */
  private endMission(kind: ResultData['kind']): void {
    this.over = true;
    const t = tally(this.people);
    const result =
      kind === 'complete'
        ? missionResult(t.saved, t.lost, t.total, SCORING)
        : gameOverResult(t.saved, t.lost, t.total, SCORING);
    const { data, isNew } = recordScore(loadSave(), result.score, SAVE);
    if (isNew) storeSave(data);
    const show: ResultData = {
      kind,
      result,
      highScore: data.highScore,
      newHigh: isNew,
      touch: this.touch !== null,
    };
    this.scene.launch('Result', show);
    this.scene.pause();
  }

  private log(kind: GameSnapshot['events'][number]): void {
    this.heliEvents.push(kind);
    if (this.heliEvents.length > MAX_EVENTS) this.heliEvents.shift();
  }

  private onPeopleEvent(event: PeopleEvent): void {
    this.log(event.kind);
    if (event.kind !== 'saved') return;
    const base = this.roofs[0];
    const popup = this.add
      .text(this.hutDoorX, (base?.y ?? 0) - PEOPLE.height, `+${SCORING.perPerson}`, {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: HUD.accent,
      })
      .setOrigin(0.5, 1)
      .setShadow(1, 1, HUD.shadow, 0, false, true);
    this.tweens.add({
      targets: popup,
      y: popup.y - HUD.popupRise,
      alpha: 0,
      duration: HUD.popupMs,
      onComplete: () => popup.destroy(),
    });
  }

  /** Walks, stands or hides each person's sprite to match their state. */
  private drawPeople(): void {
    this.people.forEach((p, i) => {
      const s = this.personSprites[i];
      if (!s) return;
      s.setVisible(visible(p))
        .setPosition(p.x, p.y)
        .setFlipX(p.facing < 0);
      const key = s.texture.key;
      const walking = p.mode === 'running' || (p.mode === 'unloading' && p.timer >= 0);
      if (walking && !s.anims.isPlaying) s.play(key);
      if (!walking && s.anims.isPlaying) s.stop().setFrame(0);
    });
  }

  private onEvent(event: HeliEvent): void {
    this.log(event.kind);
    const { flight: f } = this.heli;
    if (event.kind === 'hard-landing') {
      this.cameras.main.shake(LANDING_FX.shakeMs, LANDING_FX.shakeStrength);
    } else if (event.kind === 'crashed') {
      const { left, gameOver } = afterCrash(this.lives);
      this.lives = left;
      if (gameOver) this.wreckedFor = 0;
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
  }

  /** Keeps more of the view ahead of the helicopter than behind it. */
  private lookAhead(): void {
    this.cameras.main.setFollowOffset(-CAMERA.lookAhead * this.heli.facing, 0);
  }

  /** One turn per press of C or the touch Turn button. */
  private readTurn(): boolean {
    const pressed = this.turnPressed || (this.touch?.turn ?? false);
    this.turnPressed = false;
    if (this.touch) this.touch.turn = false;
    return pressed;
  }

  /** Keyboard first; the touch D-pad fills in whatever axis the keys leave at rest. */
  private readAxis(): Axis {
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const up = k.up.isDown || k.w.isDown;
    const down = k.down.isDown || k.s.isDown;
    const t = this.touch?.axis ?? { x: 0, y: 0 };
    return {
      x: left === right ? t.x : left ? -1 : 1,
      y: up === down ? t.y : up ? -1 : 1,
    };
  }
}

/** Seed from the URL (?seed=123) for repeatable runs, otherwise the default. */
function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : DEFAULT_SEED;
}
