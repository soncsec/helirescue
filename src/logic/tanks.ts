/**
 * Tanks (roadmap M5.2, H5): they patrol a stretch of open street and fire
 * shells up at the helicopter when it comes low and close. The barrel is
 * fixed, so a tank first stops and turns to face the helicopter, then fires
 * only within its barrel's reach (from just below level up to a steep angle):
 * flying high above it, or far away, is safe. Shells pass in front of
 * buildings, like the soldiers' shots, and burst only on the street (owner's
 * play-test, 2026-10-20), so hiding behind a building does not stop them. Shells live in a fixed pool,
 * reused, never grown. Firing times use the seeded RNG. A bomb or a few
 * bullets destroy a tank. Plain TypeScript, unit tested.
 */
import { moveShell, targetable, type EnemyEvent, type Flak, type ShellRules } from './enemies';
import type { Heli } from './landing';
import type { Rng } from './rng';
import type { Arena, Box } from './weapons';

export interface Tank {
  /** Centre of the tank, its treads on the street at y. */
  x: number;
  y: number;
  /** Patrol limits for x. */
  minX: number;
  maxX: number;
  /** 1 facing right (as drawn), -1 facing left. */
  facing: 1 | -1;
  alive: boolean;
  hp: number;
  /** Seconds until it may fire again. */
  reload: number;
  /** Seconds left of turning around; it cannot fire while turning. */
  turning: number;
  /** True while stopped to aim at the helicopter. */
  engaged: boolean;
}

export interface TankTuning extends ShellRules {
  /** Patrol speed, px/s. */
  speed: number;
  /** Fires at the helicopter within this distance of the muzzle, px. */
  range: number;
  reloadMin: number;
  reloadMax: number;
  /** A grace period before the first shot, s. */
  firstShot: number;
  /** Bullet hits to destroy a tank. */
  hp: number;
  /** Hit box around the treads: half width and height. */
  halfWidth: number;
  height: number;
  /** Barrel tip from the treads' centre (facing right). */
  muzzleX: number;
  muzzleY: number;
  /** The barrel's reach, degrees above level (negative is below). */
  minElevation: number;
  maxElevation: number;
  shellSpeed: number;
  shellLife: number;
  shellDamage: number;
  maxShells: number;
  /** How long turning around takes, s. */
  turnSeconds: number;
}

export interface Armour {
  tanks: Tank[];
  shells: Flak[];
}

export type TankEvent =
  | { kind: 'tank-fired'; tank: number; x: number; y: number }
  | { kind: 'tank-destroyed'; tank: number; x: number; y: number }
  | Extract<EnemyEvent, { kind: 'heli-hit' | 'burst' }>;

/** Tanks at their posts (centre x, street y, patrol limits), facing right, plus an empty shell pool. */
export function newArmour(
  posts: readonly { x: number; y: number; minX: number; maxX: number }[],
  t: TankTuning,
): Armour {
  return {
    tanks: posts.map((p) => ({
      ...p,
      facing: 1,
      alive: true,
      hp: t.hp,
      reload: t.firstShot,
      turning: 0,
      engaged: false,
    })),
    shells: Array.from({ length: t.maxShells }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
    })),
  };
}

/** The box a tank can be hit in (null once destroyed). */
export function tankBox(k: Tank, t: TankTuning): Box | null {
  if (!k.alive) return null;
  return { left: k.x - t.halfWidth, right: k.x + t.halfWidth, top: k.y - t.height, bottom: k.y };
}

/** Damages a tank; returns the event when that destroys it. */
export function hitTank(a: Armour, i: number, damage: number): TankEvent | null {
  const k = a.tanks[i];
  if (!k?.alive) return null;
  k.hp = Math.max(0, k.hp - damage);
  if (k.hp > 0) return null;
  k.alive = false;
  return { kind: 'tank-destroyed', tank: i, x: k.x, y: k.y };
}

/** Where shells leave the barrel. */
export function muzzle(k: Tank, t: TankTuning): { x: number; y: number } {
  return { x: k.x + k.facing * t.muzzleX, y: k.y - t.muzzleY };
}

/** Degrees above level from the muzzle to (x, y), measured the way the barrel points. */
export function elevation(k: Tank, t: TankTuning, x: number, y: number): number {
  const m = muzzle(k, t);
  return (Math.atan2(m.y - y, (x - m.x) * k.facing) * 180) / Math.PI;
}

/**
 * Drives, turns and fires every tank, and moves their shells. Changes `a` in
 * place. The scene applies the damage from `heli-hit` events.
 */
export function updateTanks(
  a: Armour,
  h: Heli,
  dt: number,
  arena: Arena,
  t: TankTuning,
  rng: Rng,
): TankEvent[] {
  const events: TankEvent[] = [];
  // Shells fly in front of the buildings: only the street stops them.
  const open: Arena = { ...arena, buildings: [] };
  for (const s of a.shells) {
    const e = moveShell(s, h, dt, open, t, t.shellLife, t.shellDamage);
    if (e?.kind === 'heli-hit' || e?.kind === 'burst') events.push(e);
  }

  const f = h.flight;
  a.tanks.forEach((k, i) => {
    if (!k.alive) return;
    k.reload = Math.max(0, k.reload - dt);
    k.turning = Math.max(0, k.turning - dt);
    const near = targetable(h) && Math.hypot(f.x - k.x, f.y - (k.y - t.muzzleY)) <= t.range;
    k.engaged = near;
    if (!near) {
      // Patrol: drive to one end, turn, drive back.
      if (k.turning > 0) return;
      k.x += k.facing * t.speed * dt;
      if (k.x >= k.maxX || k.x <= k.minX) {
        k.x = Math.min(k.maxX, Math.max(k.minX, k.x));
        k.facing = k.x >= k.maxX ? -1 : 1;
        k.turning = t.turnSeconds;
      }
      return;
    }
    // Stop, and turn to face the helicopter if it is behind.
    const want = f.x >= k.x ? 1 : -1;
    if (want !== k.facing) {
      k.facing = want;
      k.turning = t.turnSeconds;
    }
    if (k.turning > 0 || k.reload > 0) return;
    const up = elevation(k, t, f.x, f.y);
    if (up < t.minElevation || up > t.maxElevation) return;
    const shell = a.shells.find((s) => !s.alive);
    if (!shell) return;
    const m = muzzle(k, t);
    const dx = f.x - m.x;
    const dy = f.y - m.y;
    const d = Math.hypot(dx, dy) || 1;
    Object.assign(shell, {
      alive: true,
      x: m.x,
      y: m.y,
      vx: (dx / d) * t.shellSpeed,
      vy: (dy / d) * t.shellSpeed,
      age: 0,
    });
    k.reload = rng.range(t.reloadMin, t.reloadMax);
    events.push({ kind: 'tank-fired', tank: i, x: m.x, y: m.y });
  });
  return events;
}
