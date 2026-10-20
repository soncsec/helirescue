/**
 * Enemies (roadmap M3.6, H5): anti-aircraft guns on roofs that aim at the
 * helicopter and fire flak. Flak shells live in a fixed pool, reused, never
 * grown. Firing times use the seeded RNG. Plain TypeScript, unit tested.
 */
import type { Heli } from './landing';
import type { Rng } from './rng';
import { travel, type Arena, type Box } from './weapons';

export interface AaGun {
  /** Centre of the gun's base, standing on a roof at y. */
  x: number;
  y: number;
  alive: boolean;
  hp: number;
  /** Seconds until it may fire again. */
  reload: number;
  /** Sprite frame: 0 aims left, 2 straight up, 4 right. */
  aim: number;
}

export interface Flak {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export interface EnemyTuning {
  /** Fires when the helicopter is this close to the muzzle, px. */
  aaRange: number;
  /** Seconds between shots, picked at random in this range; the first shot waits firstShot. */
  aaReloadMin: number;
  aaReloadMax: number;
  firstShot: number;
  /** Bullet hits to destroy a gun. */
  aaHp: number;
  /** The gun's hit box around its base: half width and height. */
  gunHalfWidth: number;
  gunHeight: number;
  /** Where shells leave the gun, above its base. */
  muzzleY: number;
  flakSpeed: number;
  flakLife: number;
  /** Health a hit takes from the helicopter. */
  flakDamage: number;
  maxFlak: number;
  /** The helicopter's hit box for flak: half width and half height around its centre. */
  heliHalfWidth: number;
  heliHalfHeight: number;
  hitStep: number;
}

export interface Enemies {
  guns: AaGun[];
  flak: Flak[];
}

export type EnemyEvent =
  | { kind: 'flak'; gun: number }
  /** A shell hit the helicopter. */
  | { kind: 'heli-hit'; damage: number; x: number; y: number }
  /** A shell burst on a building or the street, or ran out of time in the air. */
  | { kind: 'burst'; x: number; y: number }
  | { kind: 'gun-destroyed'; gun: number; x: number; y: number };

export function newEnemies(guns: readonly { x: number; y: number }[], t: EnemyTuning): Enemies {
  return {
    guns: guns.map((g) => ({
      x: g.x,
      y: g.y,
      alive: true,
      hp: t.aaHp,
      reload: t.firstShot,
      aim: 2,
    })),
    flak: Array.from({ length: t.maxFlak }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
    })),
  };
}

/** The sprite frame that points from a gun toward (dx, dy): 0 left, 2 up, 4 right. */
export function aimFrame(dx: number, dy: number): number {
  // Angle above the horizon, 0 (right) to pi (left); targets below aim level.
  const angle = Math.atan2(Math.max(0, -dy), dx);
  return Math.max(0, Math.min(4, Math.round(4 - angle / (Math.PI / 4))));
}

/** The box a gun can be hit in (null once destroyed). */
export function gunBox(g: AaGun, t: EnemyTuning): Box | null {
  if (!g.alive) return null;
  return {
    left: g.x - t.gunHalfWidth,
    right: g.x + t.gunHalfWidth,
    top: g.y - t.gunHeight,
    bottom: g.y,
  };
}

/** Damages a gun; returns the event when that destroys it. */
export function hitGun(e: Enemies, i: number, damage: number): EnemyEvent | null {
  const g = e.guns[i];
  if (!g?.alive) return null;
  g.hp = Math.max(0, g.hp - damage);
  if (g.hp > 0) return null;
  g.alive = false;
  return { kind: 'gun-destroyed', gun: i, x: g.x, y: g.y };
}

/** Whether the helicopter can be shot at: anywhere but in a wreck. */
export const targetable = (h: Heli): boolean => h.mode !== 'crashed';

/** What a shell needs to know to hit the helicopter. */
export interface ShellRules {
  heliHalfWidth: number;
  heliHalfHeight: number;
  hitStep: number;
}

/**
 * Moves one live shell (flak or a tank shell): it hits the helicopter, bursts
 * on a building or the street, or bursts in the air after `life` seconds.
 * Changes `s` in place; returns what happened, or null while it flies on.
 */
export function moveShell(
  s: Flak,
  h: Heli,
  dt: number,
  a: Arena,
  t: ShellRules,
  life: number,
  damage: number,
): EnemyEvent | null {
  if (!s.alive) return null;
  const f = h.flight;
  s.age += dt;
  const dx = s.vx * dt;
  const dy = s.vy * dt;
  // The helicopter first, then anything solid along the path.
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / t.hitStep));
  let hitHeli = false;
  for (let i = 1; i <= n && !hitHeli; i++) {
    const x = s.x + (dx * i) / n;
    const y = s.y + (dy * i) / n;
    hitHeli =
      targetable(h) &&
      Math.abs(x - f.x) <= t.heliHalfWidth &&
      Math.abs(y - f.y) <= t.heliHalfHeight;
  }
  if (hitHeli) {
    s.alive = false;
    return { kind: 'heli-hit', damage, x: s.x, y: s.y };
  }
  const hit = travel(s, dx, dy, { ...a, targets: [] }, t.hitStep);
  s.x += dx;
  s.y += dy;
  if (hit || s.age >= life) {
    s.alive = false;
    return { kind: 'burst', x: hit?.x ?? s.x, y: hit?.y ?? s.y };
  }
  return null;
}

/**
 * Aims every gun at the helicopter, fires when it is in range and above the
 * gun, and moves the flak. Changes `e` in place. The scene applies the
 * damage from `heli-hit` events (src/logic/landing.ts hitHeli).
 */
export function updateEnemies(
  e: Enemies,
  h: Heli,
  dt: number,
  a: Arena,
  t: EnemyTuning,
  rng: Rng,
): EnemyEvent[] {
  const events: EnemyEvent[] = [];
  const f = h.flight;

  for (const s of e.flak) {
    const ev = moveShell(s, h, dt, a, t, t.flakLife, t.flakDamage);
    if (ev) events.push(ev);
  }

  e.guns.forEach((g, i) => {
    if (!g.alive) return;
    const mx = g.x;
    const my = g.y - t.muzzleY;
    const dx = f.x - mx;
    const dy = f.y - my;
    g.aim = aimFrame(dx, dy);
    g.reload = Math.max(0, g.reload - dt);
    const inRange = Math.hypot(dx, dy) <= t.aaRange && dy < 0 && targetable(h);
    if (!inRange || g.reload > 0) return;
    const shell = e.flak.find((s) => !s.alive);
    if (!shell) return;
    const d = Math.hypot(dx, dy) || 1;
    Object.assign(shell, {
      alive: true,
      x: mx,
      y: my,
      vx: (dx / d) * t.flakSpeed,
      vy: (dy / d) * t.flakSpeed,
      age: 0,
    });
    g.reload = rng.range(t.aaReloadMin, t.aaReloadMax);
    events.push({ kind: 'flak', gun: i });
  });
  return events;
}
