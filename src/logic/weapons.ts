/**
 * The forward gun and bombs (roadmap M3.5). Shots live in a fixed pool that
 * is reused, never grown (quality rule: pooled bullets): `updateWeapons`
 * changes the pool in place and the scene keeps one sprite per slot.
 * Plain TypeScript, unit tested; every number comes from WeaponsTuning.
 */
import type { Heli } from './landing';
import type { Roof } from './world';

export type ShotKind = 'bullet' | 'bomb';

export interface Shot {
  kind: ShotKind;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds since it was fired. */
  age: number;
}

export interface WeaponsTuning {
  /** Bullet speed relative to the helicopter, px/s, and how long a bullet flies, s. */
  bulletSpeed: number;
  bulletLife: number;
  /** Seconds between shots while Fire is held. */
  fireEvery: number;
  /** Where bullets leave the nose, from the helicopter's centre (facing right). */
  noseX: number;
  noseY: number;
  maxBullets: number;
  /** Bombs fall with this gravity, px/s²; one per bombEvery seconds; at most maxBombs falling. */
  bombGravity: number;
  bombEvery: number;
  maxBombs: number;
  /** Bombs leave this far below the centre (between the skids). */
  dropY: number;
  /** Shots are checked for hits at least every this many px of travel. */
  hitStep: number;
}

/** A rectangle in the world, such as an enemy that shots can hit. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** What shots can hit: buildings (solid from the roof down), the street, and targets. */
export interface Arena {
  buildings: readonly Roof[];
  groundY: number;
  width: number;
  /** Enemies, by index; a shot that hits one reports its index. Dead ones are null. */
  targets?: readonly (Box | null)[];
}

/** Distance from a point to the nearest edge of a box (0 inside it). */
export function boxDistance(b: Box, x: number, y: number): number {
  const dx = Math.max(b.left - x, 0, x - b.right);
  const dy = Math.max(b.top - y, 0, y - b.bottom);
  return Math.hypot(dx, dy);
}

export interface Weapons {
  /** The pool: bullets first, then bombs. */
  shots: Shot[];
  /** Seconds until the gun and the bomb bay are ready again. */
  fireIn: number;
  bombIn: number;
}

export type WeaponEvent =
  | { kind: 'fired' }
  | { kind: 'dropped' }
  /** A bullet hit a wall, the street, or the target with index `target`. */
  | { kind: 'impact'; x: number; y: number; target?: number }
  /** A bomb hit a roof or the street and exploded. */
  | { kind: 'blast'; x: number; y: number };

const dead = (kind: ShotKind): Shot => ({ kind, alive: false, x: 0, y: 0, vx: 0, vy: 0, age: 0 });

export function newWeapons(t: WeaponsTuning): Weapons {
  return {
    shots: [
      ...Array.from({ length: t.maxBullets }, () => dead('bullet')),
      ...Array.from({ length: t.maxBombs }, () => dead('bomb')),
    ],
    fireIn: 0,
    bombIn: 0,
  };
}

/** Only in the air: landed, the helicopter shows its front view and people climb in. */
export function armed(h: Heli): boolean {
  return h.mode === 'flying' || h.mode === 'landing';
}

/** What a shot at a point hits: a target, a building, or the street below it. */
export function hitAt(
  x: number,
  y: number,
  a: Arena,
): { x: number; y: number; roof: number; target?: number } | null {
  const targets = a.targets ?? [];
  for (let i = 0; i < targets.length; i++) {
    const b = targets[i];
    if (b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
      return { x, y, roof: y, target: i };
    }
  }
  if (y >= a.groundY) return { x, y: a.groundY, roof: a.groundY };
  for (const b of a.buildings) {
    if (x >= b.left && x <= b.right && y >= b.y) return { x, y, roof: b.y };
  }
  return null;
}

/** Moves a shot along its path in small steps; returns the first hit, if any. */
export function travel(
  s: { x: number; y: number },
  dx: number,
  dy: number,
  a: Arena,
  step: number,
): ReturnType<typeof hitAt> {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
  for (let i = 1; i <= n; i++) {
    const x = s.x + (dx * i) / n;
    const y = s.y + (dy * i) / n;
    const hit = hitAt(x, y, a);
    if (hit) return hit;
  }
  return null;
}

function spawn(pool: Shot[], kind: ShotKind): Shot | null {
  return pool.find((s) => s.kind === kind && !s.alive) ?? null;
}

/**
 * Where the gun's nose is and which way it points (owner's play-test,
 * 2026-10-20): along the body, tilted as drawn, so leaning into forward flight
 * aims the gun down ahead, not level with the horizon. (dx, dy) is a unit vector.
 */
export function gunAim(
  h: Heli,
  t: Pick<WeaponsTuning, 'noseX' | 'noseY'>,
): { x: number; y: number; dx: number; dy: number } {
  const f = h.flight;
  // The sprite turns clockwise by `tilt` degrees (y points down), flipped when facing left.
  const a = (f.tilt * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const nx = h.facing * t.noseX;
  return {
    x: f.x + nx * cos - t.noseY * sin,
    y: f.y + nx * sin + t.noseY * cos,
    dx: h.facing * cos,
    dy: h.facing * sin,
  };
}

/**
 * Advances the gun, the bomb bay and every shot by `dt` seconds. `fire` is
 * held (repeats every fireEvery); `bomb` is one press. Changes `w` in place.
 */
export function updateWeapons(
  w: Weapons,
  h: Heli,
  input: { fire: boolean; bomb: boolean },
  dt: number,
  a: Arena,
  t: WeaponsTuning,
): WeaponEvent[] {
  const events: WeaponEvent[] = [];
  w.fireIn = Math.max(0, w.fireIn - dt);
  w.bombIn = Math.max(0, w.bombIn - dt);
  const f = h.flight;

  // Move what is already flying first, so a new shot starts at the nose this frame.
  for (const s of w.shots) {
    if (!s.alive) continue;
    s.age += dt;
    if (s.kind === 'bomb') s.vy += t.bombGravity * dt;
    const hit = travel(s, s.vx * dt, s.vy * dt, a, t.hitStep);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (hit) {
      s.alive = false;
      events.push(
        s.kind === 'bomb'
          ? { kind: 'blast', x: hit.x, y: Math.min(hit.y, hit.roof) }
          : hit.target === undefined
            ? { kind: 'impact', x: hit.x, y: hit.y }
            : { kind: 'impact', x: hit.x, y: hit.y, target: hit.target },
      );
    } else if (s.x < 0 || s.x > a.width || (s.kind === 'bullet' && s.age >= t.bulletLife)) {
      s.alive = false;
    }
  }

  if (input.fire && armed(h) && w.fireIn === 0) {
    const s = spawn(w.shots, 'bullet');
    if (s) {
      const g = gunAim(h, t);
      Object.assign(s, {
        alive: true,
        x: g.x,
        y: g.y,
        vx: g.dx * t.bulletSpeed + f.vx,
        vy: g.dy * t.bulletSpeed,
        age: 0,
      });
      w.fireIn = t.fireEvery;
      events.push({ kind: 'fired' });
    }
  }

  if (input.bomb && armed(h) && w.bombIn === 0) {
    const s = spawn(w.shots, 'bomb');
    if (s) {
      Object.assign(s, { alive: true, x: f.x, y: f.y + t.dropY, vx: f.vx, vy: f.vy, age: 0 });
      w.bombIn = t.bombEvery;
      events.push({ kind: 'dropped' });
    }
  }
  return events;
}

/** How many shots of a kind are flying. */
export function flying(w: Weapons, kind: ShotKind): number {
  return w.shots.filter((s) => s.alive && s.kind === kind).length;
}
