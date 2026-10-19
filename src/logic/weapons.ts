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

/** What shots can hit: buildings (solid from the roof down) and the street. */
export interface Arena {
  buildings: readonly Roof[];
  groundY: number;
  width: number;
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
  /** A bullet hit a wall or the street. */
  | { kind: 'impact'; x: number; y: number }
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

/** The building a point is inside, or the street below it: what a shot hits there. */
function hitAt(x: number, y: number, a: Arena): { x: number; y: number; roof: number } | null {
  if (y >= a.groundY) return { x, y: a.groundY, roof: a.groundY };
  for (const b of a.buildings) {
    if (x >= b.left && x <= b.right && y >= b.y) return { x, y, roof: b.y };
  }
  return null;
}

/** Moves a shot along its path in small steps; returns the first hit, if any. */
function travel(s: Shot, dx: number, dy: number, a: Arena, step: number): ReturnType<typeof hitAt> {
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
          : { kind: 'impact', x: hit.x, y: hit.y },
      );
    } else if (s.x < 0 || s.x > a.width || (s.kind === 'bullet' && s.age >= t.bulletLife)) {
      s.alive = false;
    }
  }

  if (input.fire && armed(h) && w.fireIn === 0) {
    const s = spawn(w.shots, 'bullet');
    if (s) {
      Object.assign(s, {
        alive: true,
        x: f.x + h.facing * t.noseX,
        y: f.y + t.noseY,
        vx: h.facing * t.bulletSpeed + f.vx,
        vy: 0,
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
