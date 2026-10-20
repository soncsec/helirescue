/**
 * Enemy gunships (roadmap M5.3, H5), from mission 4: they hover over their
 * own stretch of the map, high above the rooftops, bobbing gently. When the
 * helicopter comes within range a gunship stops, turns to face it, and fires
 * an aimed burst of shots, then reloads. Six bullets bring one down; bombs
 * cannot reach it. Shots live in a fixed pool; firing times use the seeded
 * RNG. Plain TypeScript, unit tested.
 */
import { moveShell, targetable, type EnemyEvent, type Flak, type ShellRules } from './enemies';
import type { Heli } from './landing';
import type { Rng } from './rng';
import type { Arena, Box } from './weapons';

export interface Gunship {
  /** Centre of the hull; it hovers at `baseY`, bobbing around it. */
  x: number;
  y: number;
  baseY: number;
  minX: number;
  maxX: number;
  /** 1 facing right (as drawn), -1 facing left. */
  facing: 1 | -1;
  alive: boolean;
  hp: number;
  /** Seconds until the next burst, shots left in this burst, and until the next shot. */
  reload: number;
  shotsLeft: number;
  shotTimer: number;
  turning: number;
  engaged: boolean;
  /** Seconds it has existed, for the bob. */
  age: number;
}

export interface GunshipTuning extends ShellRules {
  speed: number;
  /** Bob: how far up and down, px, and how long one bob takes, s. */
  bob: number;
  bobSeconds: number;
  range: number;
  reloadMin: number;
  reloadMax: number;
  firstShot: number;
  burst: number;
  burstGap: number;
  hp: number;
  halfWidth: number;
  halfHeight: number;
  /** Where shots leave, from the centre (facing right). */
  gunX: number;
  gunY: number;
  shotSpeed: number;
  shotLife: number;
  shotDamage: number;
  maxShots: number;
  turnSeconds: number;
}

export interface Fleet {
  ships: Gunship[];
  shots: Flak[];
}

export type GunshipEvent =
  | { kind: 'gunship-fired'; ship: number; x: number; y: number }
  | { kind: 'gunship-down'; ship: number; x: number; y: number }
  | Extract<EnemyEvent, { kind: 'heli-hit' | 'burst' }>;

/** Gunships at their posts (centre x, hover y, patrol limits), plus an empty shot pool. */
export function newFleet(
  posts: readonly { x: number; y: number; minX: number; maxX: number }[],
  t: GunshipTuning,
): Fleet {
  return {
    ships: posts.map((p) => ({
      x: p.x,
      y: p.y,
      baseY: p.y,
      minX: p.minX,
      maxX: p.maxX,
      facing: -1,
      alive: true,
      hp: t.hp,
      reload: t.firstShot,
      shotsLeft: 0,
      shotTimer: 0,
      turning: 0,
      engaged: false,
      age: 0,
    })),
    shots: Array.from({ length: t.maxShots }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
    })),
  };
}

/** The box a gunship can be hit in (null once down). */
export function gunshipBox(g: Gunship, t: GunshipTuning): Box | null {
  if (!g.alive) return null;
  return {
    left: g.x - t.halfWidth,
    right: g.x + t.halfWidth,
    top: g.y - t.halfHeight,
    bottom: g.y + t.halfHeight,
  };
}

/** Damages a gunship; returns the event when that brings it down. */
export function hitGunship(f: Fleet, i: number, damage: number): GunshipEvent | null {
  const g = f.ships[i];
  if (!g?.alive) return null;
  g.hp = Math.max(0, g.hp - damage);
  if (g.hp > 0) return null;
  g.alive = false;
  return { kind: 'gunship-down', ship: i, x: g.x, y: g.y };
}

/** Where a gunship's shots leave. */
export function gunshipGun(g: Gunship, t: GunshipTuning): { x: number; y: number } {
  return { x: g.x + g.facing * t.gunX, y: g.y + t.gunY };
}

/**
 * Hovers, turns and fires every gunship, and moves their shots. Changes `f`
 * in place. The scene applies the damage from `heli-hit` events.
 */
export function updateGunships(
  f: Fleet,
  h: Heli,
  dt: number,
  arena: Arena,
  t: GunshipTuning,
  rng: Rng,
): GunshipEvent[] {
  const events: GunshipEvent[] = [];
  for (const s of f.shots) {
    const e = moveShell(s, h, dt, arena, t, t.shotLife, t.shotDamage);
    if (e?.kind === 'heli-hit' || e?.kind === 'burst') events.push(e);
  }

  const hx = h.flight.x;
  const hy = h.flight.y;
  f.ships.forEach((g, i) => {
    if (!g.alive) return;
    g.age += dt;
    g.y = g.baseY + t.bob * Math.sin((2 * Math.PI * g.age) / t.bobSeconds);
    g.reload = Math.max(0, g.reload - dt);
    g.shotTimer = Math.max(0, g.shotTimer - dt);
    g.turning = Math.max(0, g.turning - dt);
    const near = targetable(h) && Math.hypot(hx - g.x, hy - g.y) <= t.range;
    g.engaged = near;
    if (!near) {
      g.shotsLeft = 0;
      if (g.turning > 0) return;
      g.x += g.facing * t.speed * dt;
      if (g.x >= g.maxX || g.x <= g.minX) {
        g.x = Math.min(g.maxX, Math.max(g.minX, g.x));
        g.facing = g.x >= g.maxX ? -1 : 1;
        g.turning = t.turnSeconds;
      }
      return;
    }
    const want = hx >= g.x ? 1 : -1;
    if (want !== g.facing) {
      g.facing = want;
      g.turning = t.turnSeconds;
      g.shotsLeft = 0;
    }
    if (g.turning > 0) return;
    if (g.shotsLeft === 0 && g.reload <= 0) {
      g.shotsLeft = t.burst;
      g.reload = rng.range(t.reloadMin, t.reloadMax);
    }
    if (g.shotsLeft === 0 || g.shotTimer > 0) return;
    const shot = f.shots.find((s) => !s.alive);
    if (!shot) return;
    const m = gunshipGun(g, t);
    const dx = hx - m.x;
    const dy = hy - m.y;
    const d = Math.hypot(dx, dy) || 1;
    Object.assign(shot, {
      alive: true,
      x: m.x,
      y: m.y,
      vx: (dx / d) * t.shotSpeed,
      vy: (dy / d) * t.shotSpeed,
      age: 0,
    });
    g.shotsLeft--;
    g.shotTimer = t.burstGap;
    events.push({ kind: 'gunship-fired', ship: i, ...m });
  });
  return events;
}
