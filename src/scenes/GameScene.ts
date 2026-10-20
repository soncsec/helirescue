import Phaser from 'phaser';
import { sheetSpec } from '../config/assets';
import {
  BASE_ART,
  CAMERA,
  DEFAULT_SEED,
  DIFFICULTY,
  FLIGHT,
  GAME_HEIGHT,
  GAME_WIDTH,
  HELI_SHAPE,
  HUD,
  LANDING,
  LANDING_FX,
  LIVES,
  MISSION_BANNER,
  EFFECTS,
  ENEMIES,
  SOLDIERS,
  TANKS,
  JETS,
  GUNSHIPS,
  WEAPONS,
  PEOPLE,
  PLAYER,
  SAVE,
  SCENERY,
  SCORING,
  WORLD_LIMITS,
} from '../config/tuning';
import type { Axis, Point } from '../logic/movement';
import {
  hitHeli,
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
  exposed,
  personBox,
  sameRoof,
  shootPerson,
  tally,
  updatePeople,
  visible,
  waitingOn,
  type Person,
  type PeopleEvent,
} from '../logic/people';
import { wantsTouch } from '../logic/device';
import { createRng, type Rng } from '../logic/rng';
import type { TouchState } from '../logic/touch';
import {
  gunBox,
  hitGun,
  newEnemies,
  updateEnemies,
  type EnemyEvent,
  type Enemies,
} from '../logic/enemies';
import { afterCrash } from '../logic/lives';
import {
  gunshipBox,
  hitGunship,
  newFleet,
  updateGunships,
  type Fleet,
  type GunshipEvent,
} from '../logic/gunships';
import {
  hitJet,
  jetBox,
  newSky,
  updateJets,
  type JetEvent,
  type Sky,
  type Warning,
} from '../logic/jets';
import {
  hitTank,
  newArmour,
  tankBox,
  updateTanks,
  type Armour,
  type TankEvent,
} from '../logic/tanks';
import {
  hitSoldier,
  newSquad,
  soldierBox,
  updateSquad,
  type SoldierEvent,
  type Squad,
} from '../logic/soldiers';
import {
  boxDistance,
  flying,
  newWeapons,
  updateWeapons,
  type Arena,
  type WeaponEvent,
  type Weapons,
} from '../logic/weapons';
import { gameOverResult, missionOver, missionResult, rescueScore } from '../logic/score';
import { recordProgress, recordScore } from '../logic/save';
import { difficulty, type Foes } from '../logic/difficulty';
import {
  afterResult,
  isVictory,
  missionFromQuery,
  nextMission,
  type MissionStart,
} from '../logic/progress';
import { roofOf, roofUnder, soldierPost, type Roof } from '../logic/world';
import { MISSIONS, missionAt } from '../missions';
import type { WorldMap } from '../logic/world';
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
import { onPress } from './keys';
import { loadSounds, play, toggleMute } from './sound';
import { SOUNDS } from '../config/audio';

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
  /** Every helicopter and people event so far, plus bomb drops and blasts, oldest first (at most 50). */
  events: (
    | HeliEvent['kind']
    | PeopleEvent['kind']
    | 'dropped'
    | 'blast'
    | 'gun-destroyed'
    | 'soldier-down'
    | 'tank-destroyed'
    | 'tank-hit'
    | 'jet-in'
    | 'jet-down'
    | 'gunship-down'
  )[];
  people: { id: number; mode: Person['mode']; x: number; y: number }[];
  hud: HudState;
  seed: number;
  /** The mission being flown (from 1) and the score brought in from earlier missions. */
  mission: number;
  startScore: number;
  /** True while the "MISSION n" banner shows at the start. */
  banner: boolean;
  /** Shots flying now, totals so far, and how many game objects exist (pooling: it stays flat). */
  weapons: {
    bullets: number;
    bombs: number;
    fired: number;
    dropped: number;
    impacts: number;
    blasts: number;
    objects: number;
    /** People hit by the helicopter's own fire. */
    peopleHit: number;
    /** The shots flying now. */
    shots: { kind: 'bullet' | 'bomb'; x: number; y: number; vx: number }[];
  };
  /** Anti-aircraft guns, flak flying now, and flak hits taken so far. */
  enemies: {
    guns: { x: number; y: number; alive: boolean; hp: number; aim: number }[];
    flak: number;
    hitsTaken: number;
    soldiers: { x: number; y: number; mode: string; facing: 1 | -1 }[];
    soldierShots: number;
    /** People shot by soldiers so far. */
    peopleHit: number;
    /** Tanks (M5.2) and their shells flying now. */
    tanks: {
      x: number;
      y: number;
      alive: boolean;
      hp: number;
      facing: 1 | -1;
      engaged: boolean;
    }[];
    tankShells: number;
    /** Jets flying now (M5.3), their shots, the warning showing, and seconds to the next pass. */
    jets: { x: number; y: number; alive: boolean; hp: number; facing: 1 | -1 }[];
    jetShots: number;
    jetWarning: Warning | null;
    nextPass: number;
    /** Gunships (M5.3) and their shots flying now. */
    gunships: {
      x: number;
      y: number;
      alive: boolean;
      hp: number;
      facing: 1 | -1;
      engaged: boolean;
    }[];
    gunshipShots: number;
    /** Shots gunships have fired so far. */
    gunshipFired: number;
  };
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
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'z' | 'space',
  Phaser.Input.Keyboard.Key
>;

const SIDE = sheetSpec('heli-side');
const CIVILIANS = ['civilian-blue', 'civilian-green', 'civilian-yellow'] as const;
const FRONT = sheetSpec('heli-front');
const RULES: HeliRules = { flight: FLIGHT, landing: LANDING, shape: HELI_SHAPE };
const MAX_EVENTS = 50;

/**
 * The game (missions from roadmap M3.1 and M5.1): a wide city with the base at the
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
  /** The rotor loop; null between scenes. */
  private rotor: Phaser.Sound.BaseSound | null = null;
  /** C was pressed since the last frame. */
  private turnPressed = false;
  /** X was pressed since the last frame. */
  private bombPressed = false;
  /** The gun and bombs: a fixed pool of shots, one sprite per slot. */
  private weapons!: Weapons;
  private shotSprites: Phaser.GameObjects.Sprite[] = [];
  /** Pooled effects, reused in turn. */
  private sparks: Phaser.GameObjects.Sprite[] = [];
  private blasts: Phaser.GameObjects.Sprite[] = [];
  private nextSpark = 0;
  private nextBlast = 0;
  private shotCounts = { fired: 0, dropped: 0, impacts: 0, blasts: 0, peopleHit: 0 };
  /** Anti-aircraft guns and their flak (pooled), with their sprites. */
  private enemies!: Enemies;
  private gunSprites: Phaser.GameObjects.Sprite[] = [];
  private flakSprites: Phaser.GameObjects.Sprite[] = [];
  private bursts: Phaser.GameObjects.Sprite[] = [];
  private nextBurst = 0;
  private hitsTaken = 0;
  /** Soldiers and their shots (pooled), with their sprites. */
  private squad!: Squad;
  private soldierSprites: Phaser.GameObjects.Sprite[] = [];
  private soldierShotSprites: Phaser.GameObjects.Sprite[] = [];
  private peopleHit = 0;
  /** Seeded randomness for gameplay (enemy fire). */
  private rng!: Rng;
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
  private map: WorldMap = missionAt(1).map;
  /** The mission and the score brought into it (M5.1). */
  private start: MissionStart = { mission: 1, startScore: 0 };
  /** This mission's enemy numbers, from difficulty(). */
  private foe!: Foes<typeof ENEMIES, typeof SOLDIERS, typeof TANKS, typeof JETS, typeof GUNSHIPS>;
  /** Gunships and their shots (pooled), with their sprites. */
  private fleet!: Fleet;
  private gunshipSprites: Phaser.GameObjects.Sprite[] = [];
  private gunshipShotSprites: Phaser.GameObjects.Sprite[] = [];
  private gunshipFired = 0;
  /** Enemy jets and their shots (pooled), with their sprites and the warning marker. */
  private sky!: Sky;
  private jetSprites: Phaser.GameObjects.Sprite[] = [];
  private jetShotSprites: Phaser.GameObjects.Sprite[] = [];
  private jetWarning!: Phaser.GameObjects.Text;
  /** Lowest a jet pass may fly: clear of the tallest roof. */
  private jetFloorY = 0;
  /** Tanks and their shells (pooled), with their sprites. */
  private armour!: Armour;
  private tankSprites: Phaser.GameObjects.Sprite[] = [];
  private tankShellSprites: Phaser.GameObjects.Sprite[] = [];
  private banner: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Game');
  }

  /**
   * Which mission to fly: from the result screen (next mission or Retry), or
   * from the title, mission 1 unless ?mission=N picks another for play-testing.
   */
  init(data: Partial<MissionStart> | undefined): void {
    const mission = data?.mission ?? missionFromQuery(window.location.search, MISSIONS.length) ?? 1;
    this.start = { mission, startScore: data?.startScore ?? 0 };
    this.map = missionAt(mission).map;
    this.foe = difficulty(
      mission,
      { enemies: ENEMIES, soldiers: SOLDIERS, tanks: TANKS, jets: JETS, gunships: GUNSHIPS },
      DIFFICULTY,
    );
  }

  preload(): void {
    loadArt(this);
    loadSounds(this);
  }

  create(): void {
    this.seed = seedFromUrl();
    this.heliEvents = [];
    this.over = false;
    this.lives = LIVES.perMission;
    this.wreckedFor = null;
    const rng = createRng(this.seed);
    this.rng = rng;
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
    this.makeWeapons();
    this.makeEnemies();
    this.makeSquad();
    this.makeTanks();
    this.makeJets();
    this.makeGunships();
    this.startRotor();
    this.boom.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.boom.setVisible(false));
    this.touch = wantsTouch(window.location.search, (q) => window.matchMedia(q).matches)
      ? { axis: { x: 0, y: 0 }, pause: false, turn: false, fire: false, bomb: false }
      : null;
    this.scene.launch('Hud', { read: (): HudState | null => this.hudState(), touch: this.touch });

    this.showBanner();

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
      z: 'Z',
      space: 'SPACE',
    }) as Keys;
    this.bombPressed = false;
    onPress(kb, ['X'], () => {
      this.bombPressed = true;
    });
    // A press is recorded as it happens: a quick tap can come and go between
    // frames, which Phaser's JustDown would miss.
    this.turnPressed = false;
    onPress(kb, ['C'], () => {
      this.turnPressed = true;
    });
    onPress(kb, ['P', 'ESC'], () => this.pauseGame());
    onPress(kb, ['M'], () => toggleMute(this));

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
    this.rotor?.pause();
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
    const shots = updateWeapons(
      this.weapons,
      heli,
      { fire: this.readFire(), bomb: this.readBomb() },
      dt,
      this.arena(),
      WEAPONS,
    );
    for (const e of shots) this.onWeaponEvent(e);
    this.drawShots();
    const fire = updateEnemies(
      this.enemies,
      this.heli,
      dt,
      this.arena(),
      this.foe.enemies,
      this.rng,
    );
    for (const e of fire) this.onEnemyEvent(e);
    const armour = updateTanks(this.armour, this.heli, dt, this.arena(), this.foe.tanks, this.rng);
    for (const e of armour) this.onTankEvent(e);
    const left = this.cameras.main.scrollX;
    const view = { left, right: left + GAME_WIDTH, bottomY: this.jetFloorY };
    const sky = updateJets(
      this.sky,
      this.heli,
      dt,
      this.arena(),
      view,
      this.map.jets,
      this.foe.jets,
      this.rng,
    );
    for (const e of sky) this.onJetEvent(e);
    const fleet = updateGunships(
      this.fleet,
      this.heli,
      dt,
      this.arena(),
      this.foe.gunships,
      this.rng,
    );
    for (const e of fleet) this.onGunshipEvent(e);
    const out = this.people.filter(exposed).map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      roof: this.roofs.findIndex((r) => sameRoof(r, p.roof)),
      vx: p.mode === 'running' ? p.facing * PEOPLE.runSpeed : 0,
    }));
    const squad = updateSquad(this.squad, out, dt, this.arena(), this.foe.soldiers, this.rng);
    for (const e of squad) this.onSoldierEvent(e);
    this.drawEnemies();
    // Flak may have crashed it: people aboard are lost this same frame.
    const moved = updatePeople(this.people, this.heli, dt, this.hutDoorX, PEOPLE);
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
      mission: this.start.mission,
      startScore: this.start.startScore,
      banner: this.banner.some((t) => t.visible && t.alpha > 0),
      weapons: {
        bullets: flying(this.weapons, 'bullet'),
        bombs: flying(this.weapons, 'bomb'),
        ...this.shotCounts,
        objects: this.children.length,
        shots: this.weapons.shots
          .filter((s) => s.alive)
          .map((s) => ({ kind: s.kind, x: s.x, y: s.y, vx: s.vx })),
      },
      enemies: {
        guns: this.enemies.guns.map((g) => ({
          x: g.x,
          y: g.y,
          alive: g.alive,
          hp: g.hp,
          aim: g.aim,
        })),
        flak: this.enemies.flak.filter((s) => s.alive).length,
        hitsTaken: this.hitsTaken,
        soldiers: this.squad.soldiers.map((s) => ({
          x: s.x,
          y: s.y,
          mode: s.mode,
          facing: s.facing,
        })),
        soldierShots: this.squad.shots.filter((s) => s.alive).length,
        peopleHit: this.peopleHit,
        tanks: this.armour.tanks.map((k) => ({
          x: k.x,
          y: k.y,
          alive: k.alive,
          hp: k.hp,
          facing: k.facing,
          engaged: k.engaged,
        })),
        tankShells: this.armour.shells.filter((s) => s.alive).length,
        jets: this.sky.jets.map((j) => ({
          x: j.x,
          y: j.y,
          alive: j.alive,
          hp: j.hp,
          facing: j.facing,
        })),
        jetShots: this.sky.shots.filter((s) => s.alive).length,
        jetWarning: this.sky.warning ? { ...this.sky.warning } : null,
        nextPass: this.sky.nextPass,
        gunships: this.fleet.ships.map((g) => ({
          x: g.x,
          y: g.y,
          alive: g.alive,
          hp: g.hp,
          facing: g.facing,
          engaged: g.engaged,
        })),
        gunshipShots: this.fleet.shots.filter((s) => s.alive).length,
        gunshipFired: this.gunshipFired,
      },
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
      score: this.start.startScore + rescueScore(t.saved, SCORING),
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
    const { mission, startScore } = this.start;
    const total = startScore + result.score;
    const next = kind === 'complete' ? nextMission(mission, MISSIONS.length) : null;
    const progress = recordProgress(loadSave(), next ?? mission, SAVE);
    const { data, isNew } = recordScore(progress.data, total, SAVE);
    if (isNew || progress.changed) storeSave(data);
    const show: ResultData = {
      kind,
      result,
      mission,
      name: missionAt(mission).name,
      startScore,
      total,
      next: next !== null,
      victory: isVictory(kind, mission, MISSIONS.length),
      then: afterResult(kind, this.start, total, MISSIONS.length),
      highScore: data.highScore,
      newHigh: isNew,
      touch: this.touch !== null,
    };
    this.rotor?.stop();
    for (const t of this.banner) t.setVisible(false);
    this.scene.launch('Result', show);
    this.scene.pause();
  }

  /** "MISSION n" and the mission's name across the screen, fading out after a moment. */
  private showBanner(): void {
    const B = MISSION_BANNER;
    const line = (y: number, text: string, colour: string): Phaser.GameObjects.Text =>
      this.add
        .text(GAME_WIDTH / 2, y, text, {
          fontFamily: HUD.font,
          fontSize: `${HUD.fontSize}px`,
          color: colour,
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(3)
        .setShadow(1, 1, HUD.shadow, 0, false, true);
    const { mission } = this.start;
    this.banner = [
      line(B.y, `MISSION ${mission}`, HUD.accent),
      line(B.y + B.nameGap, missionAt(mission).name, HUD.colour),
    ];
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: B.holdSeconds * 1000,
      duration: B.fadeSeconds * 1000,
      onComplete: () => this.banner.forEach((t) => t.setVisible(false)),
    });
  }

  /** The rotor's hum: a loop that follows the helicopter (see drawRotor). */
  private startRotor(): void {
    this.rotor?.destroy();
    this.rotor = this.sound.add('sfx-rotor', { volume: SOUNDS['sfx-rotor'].volume, loop: true });
    this.rotor.play();
    this.events.off(Phaser.Scenes.Events.RESUME, this.resumeRotor, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.resumeRotor, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.rotor?.destroy();
      this.rotor = null;
    });
  }

  private resumeRotor(): void {
    if (!this.over) this.rotor?.resume();
  }

  /** Faster while climbing, slower and quieter when landed, silent in a wreck. */
  private drawRotor(axis: Axis): void {
    const r = this.rotor as Phaser.Sound.WebAudioSound | null;
    if (!r) return;
    const h = this.heli;
    if (h.mode === 'crashed') {
      if (r.isPlaying) r.pause();
      return;
    }
    if (r.isPaused && this.scene.isActive()) r.resume();
    const rate =
      h.mode === 'landed'
        ? LANDING_FX.rotorLanded
        : axis.y < 0
          ? PLAYER.rotorClimb
          : PLAYER.rotorIdle;
    if (typeof r.setRate === 'function') r.setRate(0.75 + rate / 4);
    if (typeof r.setVolume === 'function') {
      r.setVolume(SOUNDS['sfx-rotor'].volume * (h.mode === 'landed' ? 0.5 : 1));
    }
  }

  private log(kind: GameSnapshot['events'][number]): void {
    this.heliEvents.push(kind);
    if (this.heliEvents.length > MAX_EVENTS) this.heliEvents.shift();
  }

  private onPeopleEvent(event: PeopleEvent): void {
    this.log(event.kind);
    play(
      this,
      event.kind === 'boarded' ? 'sfx-board' : event.kind === 'saved' ? 'sfx-saved' : 'sfx-lost',
    );
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
    if (event.kind === 'landed') play(this, 'sfx-land');
    else if (event.kind === 'hard-landing') play(this, 'sfx-hard-land');
    else if (event.kind === 'crashed') play(this, 'sfx-crash');
    else if (event.kind === 'hit') play(this, 'sfx-heli-hit');
    const hurtBump = event.kind === 'bumped' && event.damage > 0;
    if (hurtBump) play(this, 'sfx-heli-hit');
    const { flight: f } = this.heli;
    if (event.kind === 'hard-landing' || hurtBump) {
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
    this.drawRotor(axis);
  }

  /** Keeps more of the view ahead of the helicopter than behind it. */
  private lookAhead(): void {
    this.cameras.main.setFollowOffset(-CAMERA.lookAhead * this.heli.facing, 0);
  }

  /** Builds the shot pool and one sprite per slot, plus the effect pools (all hidden). */
  private makeWeapons(): void {
    this.weapons = newWeapons(WEAPONS);
    this.shotCounts = { fired: 0, dropped: 0, impacts: 0, blasts: 0, peopleHit: 0 };
    this.shotSprites = this.weapons.shots.map((s) =>
      s.kind === 'bullet'
        ? this.add.sprite(0, 0, 'bullet').play('bullet').setVisible(false)
        : this.add.sprite(0, 0, 'bomb', 0).setVisible(false),
    );
    const effect = (key: string): Phaser.GameObjects.Sprite => {
      const fx = this.add.sprite(0, 0, key).setVisible(false).setDepth(2);
      fx.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.setVisible(false));
      return fx;
    };
    this.sparks = Array.from({ length: EFFECTS.sparks }, () => effect('spark'));
    this.blasts = Array.from({ length: EFFECTS.blasts }, () => effect('explosion'));
    this.nextSpark = 0;
    this.nextBlast = 0;
  }

  /** What shots can hit: every building (the base too), the street, and the guns. */
  private arena(): Arena {
    return {
      buildings: this.roofs,
      groundY: this.world.groundY,
      width: this.map.width,
      // Guns, soldiers, tanks, jets, gunships, then people: a hit's target index says which.
      targets: [
        ...this.enemies.guns.map((g) => gunBox(g, this.foe.enemies)),
        ...this.squad.soldiers.map((s) => soldierBox(s, this.foe.soldiers)),
        ...this.armour.tanks.map((k) => tankBox(k, this.foe.tanks)),
        ...this.sky.jets.map((j) => jetBox(j, this.foe.jets)),
        ...this.fleet.ships.map((g) => gunshipBox(g, this.foe.gunships)),
        // Our own fire hits people too (owner, 2026-10-19).
        ...this.people.map((p) => personBox(p, PEOPLE)),
      ],
    };
  }

  /** The mission's guns on their roofs, the flak pool, and one sprite per gun and shell. */
  private makeEnemies(): void {
    const guns = (this.map.aaGuns ?? []).map((g) => {
      const roof = roofUnder(this.map, g.x, WORLD_LIMITS);
      if (!roof) throw new Error(`gun at ${g.x} is not on a roof`);
      return { x: g.x, y: roof.y };
    });
    this.enemies = newEnemies(guns, this.foe.enemies);
    this.hitsTaken = 0;
    this.gunSprites = this.enemies.guns.map((g) =>
      this.add.sprite(g.x, g.y + 1, 'aa-turret', g.aim).setOrigin(0.5, 1),
    );
    this.flakSprites = this.enemies.flak.map(() =>
      this.add.sprite(0, 0, 'flak').play('flak').setVisible(false).setDepth(2),
    );
    this.bursts = Array.from({ length: EFFECTS.bursts }, () => {
      const fx = this.add.sprite(0, 0, 'burst').setVisible(false).setDepth(2);
      fx.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.setVisible(false));
      return fx;
    });
    this.nextBurst = 0;
  }

  /** The mission's soldiers at their posts, their shot pool, and their sprites. */
  private makeSquad(): void {
    const posts = (this.map.soldiers ?? []).map((s) => soldierPost(this.map, s, WORLD_LIMITS));
    this.squad = newSquad(
      posts.map((p, i) => {
        const s = this.map.soldiers?.[i];
        return { x: s?.x ?? p.minX, y: p.y, minX: p.minX, maxX: p.maxX };
      }),
      this.foe.soldiers,
    );
    this.peopleHit = 0;
    const anim = (key: string, start: number, end: number, fps: number, repeat: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('soldier', { start, end }),
        frameRate: fps,
        repeat,
      });
    };
    anim('soldier-run', SOLDIERS.frames.run[0], SOLDIERS.frames.run[1], 14, -1);
    anim('soldier-shoot', SOLDIERS.frames.shoot[0], SOLDIERS.frames.shoot[1], 8, -1);
    anim('soldier-down', SOLDIERS.frames.down[0], SOLDIERS.frames.down[1], 6, 0);
    this.soldierSprites = this.squad.soldiers.map((s) =>
      this.add
        .sprite(s.x, s.y + 1, 'soldier')
        .setOrigin(0.5, 1)
        .play('soldier-run'),
    );
    this.soldierShotSprites = this.squad.shots.map(() =>
      this.add.sprite(0, 0, 'bullet').setTint(SOLDIERS.shotTint).setVisible(false).setDepth(2),
    );
  }

  /** The mission's tanks on the street, their shell pool, and their sprites (M5.2). */
  private makeTanks(): void {
    const { groundY } = SCENERY;
    this.armour = newArmour(
      (this.map.tanks ?? []).map((k) => ({
        x: k.x,
        y: groundY,
        minX: k.x - k.patrol,
        maxX: k.x + k.patrol,
      })),
      this.foe.tanks,
    );
    this.tankSprites = this.armour.tanks.map((k) =>
      this.add
        .sprite(k.x, k.y + 1, 'tank')
        .setOrigin(0.5, 1)
        .play('tank'),
    );
    this.tankShellSprites = this.armour.shells.map(() =>
      this.add
        .sprite(0, 0, 'flak')
        .play('flak')
        .setTint(TANKS.shellTint)
        .setVisible(false)
        .setDepth(2),
    );
  }

  private onTankEvent(e: TankEvent): void {
    if (e.kind === 'heli-hit' || e.kind === 'burst') {
      // Logged so tests can tell a tank's hit from a gun's.
      if (e.kind === 'heli-hit') this.log('tank-hit');
      this.onEnemyEvent(e);
      return;
    }
    if (e.kind === 'tank-fired') {
      play(this, 'sfx-flak');
      const fx = this.sparks[this.nextSpark++ % this.sparks.length];
      fx?.setPosition(e.x, e.y).setVisible(true).play({ key: 'spark', repeat: 0 });
      return;
    }
    // A tank destroyed: an explosion where it stood.
    this.log('tank-destroyed');
    play(this, 'sfx-blast');
    const fx = this.blasts[this.nextBlast++ % this.blasts.length];
    fx?.setPosition(e.x, e.y)
      .setOrigin(0.5, 0.8)
      .setVisible(true)
      .play({ key: 'explosion', repeat: 0 });
    this.cameras.main.shake(EFFECTS.blastShakeMs, EFFECTS.blastShake);
  }

  /** The jet pool, its shot pool, their sprites and the warning marker (M5.3). */
  private makeJets(): void {
    this.sky = newSky(this.map.jets, this.foe.jets);
    const tallest = Math.min(...this.roofs.map((r) => r.y));
    this.jetFloorY = tallest - JETS.roofClearance;
    this.jetSprites = this.sky.jets.map(() =>
      this.add.sprite(0, 0, 'vtol-jet').setVisible(false).setDepth(1),
    );
    this.jetShotSprites = this.sky.shots.map(() =>
      this.add.sprite(0, 0, 'bullet').setTint(JETS.shotTint).setVisible(false).setDepth(2),
    );
    this.jetWarning = this.add
      .text(0, 0, '!', {
        fontFamily: HUD.font,
        fontSize: `${JETS.warnSize}px`,
        color: JETS.warnColour,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3)
      .setShadow(1, 1, HUD.shadow, 0, false, true)
      .setVisible(false);
  }

  /** The mission's gunships, their shot pool, and their sprites (M5.3). */
  private makeGunships(): void {
    this.fleet = newFleet(
      (this.map.gunships ?? []).map((g) => ({
        x: g.x,
        y: g.y,
        minX: g.x - g.patrol,
        maxX: g.x + g.patrol,
      })),
      this.foe.gunships,
    );
    this.gunshipSprites = this.fleet.ships.map((g) =>
      this.add.sprite(g.x, g.y, 'gunship').play('gunship').setDepth(1),
    );
    this.gunshipFired = 0;
    this.gunshipShotSprites = this.fleet.shots.map(() =>
      this.add.sprite(0, 0, 'bullet').setTint(GUNSHIPS.shotTint).setVisible(false).setDepth(2),
    );
  }

  private onGunshipEvent(e: GunshipEvent): void {
    if (e.kind === 'heli-hit' || e.kind === 'burst') {
      this.onEnemyEvent(e);
      return;
    }
    if (e.kind === 'gunship-fired') {
      this.gunshipFired++;
      play(this, 'sfx-soldier-shot');
      return;
    }
    this.log('gunship-down');
    play(this, 'sfx-blast');
    const fx = this.blasts[this.nextBlast++ % this.blasts.length];
    fx?.setPosition(e.x, e.y).setOrigin(0.5).setVisible(true).play({ key: 'explosion', repeat: 0 });
    this.cameras.main.shake(EFFECTS.blastShakeMs, EFFECTS.blastShake);
  }

  /**
   * Test hook only (e2e build): brings the next jet pass forward to now, so
   * jets can be tested without waiting for the mission's first pass. Not
   * reachable in the player build.
   */
  jetPassForTest(): void {
    if (this.map.jets) this.sky.nextPass = Math.min(this.sky.nextPass, JETS.warnSeconds);
  }

  private onJetEvent(e: JetEvent): void {
    if (e.kind === 'heli-hit' || e.kind === 'burst') {
      this.onEnemyEvent(e);
      return;
    }
    if (e.kind === 'jet-warning') {
      play(this, 'sfx-select');
      return;
    }
    if (e.kind === 'jet-fired') {
      play(this, 'sfx-soldier-shot');
      return;
    }
    if (e.kind === 'jet-in') {
      this.log('jet-in');
      return;
    }
    // Shot down: an explosion in the air.
    this.log('jet-down');
    play(this, 'sfx-blast');
    const fx = this.blasts[this.nextBlast++ % this.blasts.length];
    fx?.setPosition(e.x, e.y).setOrigin(0.5).setVisible(true).play({ key: 'explosion', repeat: 0 });
    this.cameras.main.shake(EFFECTS.blastShakeMs, EFFECTS.blastShake);
  }

  /** Someone hit by the helicopter's own bullet or bomb: lost, like a soldier's hit. */
  private friendlyFire(id: number): void {
    const { people, event } = shootPerson(this.people, id, visible);
    this.people = people;
    if (event) {
      this.shotCounts.peopleHit++;
      this.onPeopleEvent(event);
    }
  }

  private onSoldierEvent(e: SoldierEvent): void {
    if (e.kind === 'soldier-fired') {
      play(this, 'sfx-soldier-shot');
      return;
    }
    if (e.kind === 'person-hit') {
      const { people, event } = shootPerson(this.people, e.id);
      this.people = people;
      if (event) {
        this.peopleHit++;
        this.onPeopleEvent(event);
      }
      const fx = this.bursts[this.nextBurst++ % this.bursts.length];
      fx?.setPosition(e.x, e.y).setVisible(true).play({ key: 'burst', repeat: 0 });
      return;
    }
    if (e.kind === 'shot-stopped') {
      const fx = this.sparks[this.nextSpark++ % this.sparks.length];
      fx?.setPosition(e.x, e.y).setVisible(true).play({ key: 'spark', repeat: 0 });
      return;
    }
    this.log('soldier-down');
  }

  private onEnemyEvent(e: EnemyEvent): void {
    if (e.kind === 'flak') {
      play(this, 'sfx-flak');
      return;
    }
    if (e.kind === 'burst') {
      const fx = this.bursts[this.nextBurst++ % this.bursts.length];
      fx?.setPosition(e.x, e.y).setVisible(true).play({ key: 'burst', repeat: 0 });
      return;
    }
    if (e.kind === 'heli-hit') {
      this.hitsTaken++;
      const { heli, event } = hitHeli(this.heli, e.damage);
      this.heli = heli;
      if (event.kind !== 'none') this.onEvent(event);
      const fx = this.bursts[this.nextBurst++ % this.bursts.length];
      fx?.setPosition(e.x, e.y).setVisible(true).play({ key: 'burst', repeat: 0 });
      return;
    }
    // A gun destroyed: an explosion where it stood.
    this.log('gun-destroyed');
    play(this, 'sfx-blast');
    const fx = this.blasts[this.nextBlast++ % this.blasts.length];
    fx?.setPosition(e.x, e.y)
      .setOrigin(0.5, 0.8)
      .setVisible(true)
      .play({ key: 'explosion', repeat: 0 });
    this.cameras.main.shake(EFFECTS.blastShakeMs, EFFECTS.blastShake);
  }

  /** Guns aim (frame) or disappear when destroyed; flak sprites follow their shells. */
  private drawEnemies(): void {
    this.squad.soldiers.forEach((s, i) => {
      const sprite = this.soldierSprites[i];
      if (!sprite) return;
      sprite
        .setVisible(s.mode !== 'gone')
        .setPosition(s.x, s.y + 1)
        .setFlipX(s.facing < 0);
      const key =
        s.mode === 'down' ? 'soldier-down' : s.mode === 'shoot' ? 'soldier-shoot' : 'soldier-run';
      if (s.mode !== 'gone' && sprite.anims.currentAnim?.key !== key) sprite.play(key);
    });
    this.squad.shots.forEach((s, i) => {
      const sprite = this.soldierShotSprites[i];
      sprite?.setVisible(s.alive);
      if (s.alive) sprite?.setPosition(s.x, s.y).setFlipX(s.vx < 0);
    });
    this.enemies.guns.forEach((g, i) => {
      this.gunSprites[i]?.setVisible(g.alive).setFrame(g.aim);
    });
    // Treads roll while driving and stop while turning or aiming.
    this.armour.tanks.forEach((k, i) => {
      const sprite = this.tankSprites[i];
      if (!sprite) return;
      sprite
        .setVisible(k.alive)
        .setPosition(k.x, k.y + 1)
        .setFlipX(k.facing < 0);
      const rolling = k.alive && !k.engaged && k.turning === 0;
      if (rolling && !sprite.anims.isPlaying) sprite.play('tank');
      if (!rolling && sprite.anims.isPlaying) sprite.anims.pause();
    });
    this.armour.shells.forEach((s, i) => {
      const sprite = this.tankShellSprites[i];
      sprite?.setVisible(s.alive);
      if (s.alive) sprite?.setPosition(s.x, s.y);
    });
    this.fleet.ships.forEach((g, i) => {
      this.gunshipSprites[i]
        ?.setVisible(g.alive)
        .setPosition(g.x, g.y)
        .setFlipX(g.facing < 0);
    });
    this.fleet.shots.forEach((s, i) => {
      const sprite = this.gunshipShotSprites[i];
      sprite?.setVisible(s.alive);
      if (s.alive) sprite?.setPosition(s.x, s.y).setFlipX(s.vx < 0);
    });
    this.sky.jets.forEach((j, i) => {
      const sprite = this.jetSprites[i];
      sprite?.setVisible(j.alive);
      if (j.alive) sprite?.setPosition(j.x, j.y).setFlipX(j.facing < 0);
    });
    this.sky.shots.forEach((s, i) => {
      const sprite = this.jetShotSprites[i];
      sprite?.setVisible(s.alive);
      if (s.alive) sprite?.setPosition(s.x, s.y).setFlipX(s.vx < 0);
    });
    // The warning blinks at the edge the jet will come from, at its height.
    const w = this.sky.warning;
    const blink = Math.floor(this.time.now / JETS.warnBlinkMs) % 2 === 0;
    this.jetWarning.setVisible(w !== null && blink);
    if (w) {
      const x =
        w.side === -1
          ? JETS.warnInset + JETS.warnSize / 2
          : GAME_WIDTH - JETS.warnInset - JETS.warnSize / 2;
      this.jetWarning.setPosition(x, w.y);
    }
    this.enemies.flak.forEach((s, i) => {
      const sprite = this.flakSprites[i];
      sprite?.setVisible(s.alive);
      if (s.alive) sprite?.setPosition(s.x, s.y);
    });
  }

  private onWeaponEvent(e: WeaponEvent): void {
    if (e.kind === 'fired') {
      this.shotCounts.fired++;
      play(this, 'sfx-gun');
    } else if (e.kind === 'dropped') {
      this.shotCounts.dropped++;
      play(this, 'sfx-bomb-drop');
      this.log('dropped');
    } else if (e.kind === 'impact') {
      this.shotCounts.impacts++;
      play(this, 'sfx-spark');
      const fx = this.sparks[this.nextSpark++ % this.sparks.length];
      fx?.setPosition(e.x, e.y).setVisible(true).play({ key: 'spark', repeat: 0 });
      if (e.target !== undefined) {
        const guns = this.enemies.guns.length;
        const soldiers = guns + this.squad.soldiers.length;
        const tanks = soldiers + this.armour.tanks.length;
        const jets = tanks + this.sky.jets.length;
        const ships = jets + this.fleet.ships.length;
        if (e.target < guns) {
          const destroyed = hitGun(this.enemies, e.target, 1);
          if (destroyed) this.onEnemyEvent(destroyed);
        } else if (e.target < soldiers) {
          const down = hitSoldier(this.squad, e.target - guns);
          if (down) this.onSoldierEvent(down);
        } else if (e.target < tanks) {
          const destroyed = hitTank(this.armour, e.target - soldiers, 1);
          if (destroyed) this.onTankEvent(destroyed);
        } else if (e.target < jets) {
          const down = hitJet(this.sky, e.target - tanks, 1);
          if (down) this.onJetEvent(down);
        } else if (e.target < ships) {
          const down = hitGunship(this.fleet, e.target - jets, 1);
          if (down) this.onGunshipEvent(down);
        } else {
          const p = this.people[e.target - ships];
          if (p) this.friendlyFire(p.id);
        }
      }
    } else {
      this.shotCounts.blasts++;
      play(this, 'sfx-blast');
      this.log('blast');
      // A bomb hits any people close enough to the blast (owner, 2026-10-19).
      for (const p of this.people) {
        const box = personBox(p, PEOPLE);
        if (box && boxDistance(box, e.x, e.y) <= WEAPONS.peopleBlastRadius) this.friendlyFire(p.id);
      }
      // A bomb takes down any soldier close enough to the blast.
      this.squad.soldiers.forEach((s, i) => {
        const box = soldierBox(s, this.foe.soldiers);
        if (box && boxDistance(box, e.x, e.y) <= SOLDIERS.blastRadius) {
          const down = hitSoldier(this.squad, i);
          if (down) this.onSoldierEvent(down);
        }
      });
      // A bomb destroys any gun close enough to the blast.
      this.enemies.guns.forEach((g, i) => {
        const box = gunBox(g, this.foe.enemies);
        if (box && boxDistance(box, e.x, e.y) <= ENEMIES.blastRadius) {
          const destroyed = hitGun(this.enemies, i, g.hp);
          if (destroyed) this.onEnemyEvent(destroyed);
        }
      });
      // And any tank close enough.
      this.armour.tanks.forEach((k, i) => {
        const box = tankBox(k, this.foe.tanks);
        if (box && boxDistance(box, e.x, e.y) <= TANKS.blastRadius) {
          const destroyed = hitTank(this.armour, i, k.hp);
          if (destroyed) this.onTankEvent(destroyed);
        }
      });
      const fx = this.blasts[this.nextBlast++ % this.blasts.length];
      fx?.setPosition(e.x, e.y)
        .setOrigin(0.5, 0.8)
        .setVisible(true)
        .play({ key: 'explosion', repeat: 0 });
      this.cameras.main.shake(EFFECTS.blastShakeMs, EFFECTS.blastShake);
    }
  }

  /** Shows each pooled sprite where its shot is, or hides it. */
  private drawShots(): void {
    this.weapons.shots.forEach((s, i) => {
      const sprite = this.shotSprites[i];
      if (!sprite) return;
      sprite.setVisible(s.alive);
      if (s.alive) sprite.setPosition(s.x, s.y).setFlipX(s.vx < 0);
    });
  }

  /** Fire is held: Z, Space, or the touch FIRE button. */
  private readFire(): boolean {
    return this.keys.z.isDown || this.keys.space.isDown || (this.touch?.fire ?? false);
  }

  /** One bomb per press of X or the touch BOMB button. */
  private readBomb(): boolean {
    const pressed = this.bombPressed || (this.touch?.bomb ?? false);
    this.bombPressed = false;
    if (this.touch) this.touch.bomb = false;
    return pressed;
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
