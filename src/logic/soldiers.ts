/**
 * Enemy soldiers (roadmap M3.6, H5): they patrol a roof or a stretch of
 * street and shoot at people running to the helicopter or climbing in. Their
 * shots live in a fixed pool, reused, never grown; timing uses the seeded RNG.
 * Plain TypeScript, unit tested.
 */
import type { Rng } from './rng';
import { hitAt, type Arena, type Box } from './weapons';

export interface Soldier {
  /** Feet position: on a roof or the street. */
  x: number;
  y: number;
  /** Patrol limits. */
  minX: number;
  maxX: number;
  facing: 1 | -1;
  /** patrol: walking. shoot: stopped, firing at someone. down: hit, falling. gone: removed. */
  mode: 'patrol' | 'shoot' | 'down' | 'gone';
  /** Seconds until it may fire again. */
  reload: number;
  /** Seconds left showing the shooting pose after a shot. */
  pose: number;
  /** Seconds since it went down. */
  downFor: number;
}

export interface SoldierShot {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  /** The roof the target stood on: the shot passes its edge (street soldiers fire up past it). */
  pass: number;
}

/** A person the soldiers may shoot at: running to the helicopter or climbing in. */
export interface Exposed {
  id: number;
  x: number;
  /** Feet. */
  y: number;
  /** Index of the roof they stand on, in Arena.buildings. */
  roof: number;
  /** Running speed, px/s (negative going left; 0 while climbing in). */
  vx: number;
}

export interface SoldierTuning {
  walkSpeed: number;
  /** Shoots at people within this distance, px. */
  range: number;
  reloadMin: number;
  reloadMax: number;
  firstShot: number;
  /** Shows the shooting pose this long after a shot, s. */
  shootPose: number;
  /** Where shots leave the rifle, from the feet (facing right). */
  muzzleX: number;
  muzzleY: number;
  shotSpeed: number;
  shotLife: number;
  maxShots: number;
  /** Hit box around the feet: half width and height. */
  halfWidth: number;
  height: number;
  /** A person's hit box: half width and height from the feet. */
  personHalfWidth: number;
  personHeight: number;
  /** How long the falling animation shows before the soldier is gone, s. */
  downSeconds: number;
  hitStep: number;
}

export interface Squad {
  soldiers: Soldier[];
  shots: SoldierShot[];
}

export type SoldierEvent =
  | { kind: 'soldier-fired'; soldier: number }
  | { kind: 'person-hit'; id: number; x: number; y: number }
  | { kind: 'shot-stopped'; x: number; y: number }
  | { kind: 'soldier-down'; soldier: number; x: number; y: number };

export function newSquad(
  soldiers: readonly { x: number; y: number; minX: number; maxX: number }[],
  t: SoldierTuning,
): Squad {
  return {
    soldiers: soldiers.map((s, i) => ({
      ...s,
      facing: i % 2 === 0 ? 1 : -1,
      mode: 'patrol',
      reload: t.firstShot,
      pose: 0,
      downFor: 0,
    })),
    shots: Array.from({ length: t.maxShots }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      pass: -1,
    })),
  };
}

/** The box a soldier can be hit in; null once down. */
export function soldierBox(s: Soldier, t: SoldierTuning): Box | null {
  if (s.mode === 'down' || s.mode === 'gone') return null;
  return { left: s.x - t.halfWidth, right: s.x + t.halfWidth, top: s.y - t.height, bottom: s.y };
}

/** A hit takes a soldier down (one hit is enough). */
export function hitSoldier(q: Squad, i: number): SoldierEvent | null {
  const s = q.soldiers[i];
  if (!s || s.mode === 'down' || s.mode === 'gone') return null;
  s.mode = 'down';
  s.downFor = 0;
  return { kind: 'soldier-down', soldier: i, x: s.x, y: s.y };
}

/**
 * Moves the soldiers and their shots. Changes `q` in place. People hit are
 * reported as `person-hit`; the scene marks them lost (src/logic/people.ts).
 */
export function updateSquad(
  q: Squad,
  people: readonly Exposed[],
  dt: number,
  a: Arena,
  t: SoldierTuning,
  rng: Rng,
): SoldierEvent[] {
  const events: SoldierEvent[] = [];

  for (const shot of q.shots) {
    if (!shot.alive) continue;
    shot.age += dt;
    const dx = shot.vx * dt;
    const dy = shot.vy * dt;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / t.hitStep));
    let done = false;
    for (let i = 1; i <= n && !done; i++) {
      const x = shot.x + (dx * i) / n;
      const y = shot.y + (dy * i) / n;
      const person = people.find(
        (p) => Math.abs(x - p.x) <= t.personHalfWidth && y <= p.y && y >= p.y - t.personHeight,
      );
      if (person) {
        events.push({ kind: 'person-hit', id: person.id, x, y });
        done = true;
        break;
      }
      const solid = {
        ...a,
        targets: [],
        buildings: a.buildings.filter((_, b) => b !== shot.pass),
      };
      if (hitAt(x, y, solid)) {
        events.push({ kind: 'shot-stopped', x, y });
        done = true;
      }
    }
    shot.x += dx;
    shot.y += dy;
    if (done || shot.age >= t.shotLife) shot.alive = false;
  }

  q.soldiers.forEach((s, i) => {
    if (s.mode === 'gone') return;
    if (s.mode === 'down') {
      s.downFor += dt;
      if (s.downFor >= t.downSeconds) s.mode = 'gone';
      return;
    }
    s.reload = Math.max(0, s.reload - dt);
    s.pose = Math.max(0, s.pose - dt);
    const target = nearest(s, people, t.range);
    if (!target) {
      if (s.pose > 0) return; // finish the shooting pose
      s.mode = 'patrol';
      s.x += s.facing * t.walkSpeed * dt;
      if (s.x >= s.maxX) {
        s.x = s.maxX;
        s.facing = -1;
      } else if (s.x <= s.minX) {
        s.x = s.minX;
        s.facing = 1;
      }
      return;
    }
    s.mode = 'shoot';
    s.facing = target.x >= s.x ? 1 : -1;
    if (s.reload > 0) return;
    const shot = q.shots.find((x) => !x.alive);
    if (!shot) return;
    const mx = s.x + s.facing * t.muzzleX;
    const my = s.y - t.muzzleY;
    // Lead a running target: aim where they will be when the shot arrives.
    const ty = target.y - t.personHeight / 2;
    const lead = Math.hypot(target.x - mx, ty - my) / t.shotSpeed;
    const tx = target.x + target.vx * lead;
    const d = Math.hypot(tx - mx, ty - my) || 1;
    Object.assign(shot, {
      alive: true,
      x: mx,
      y: my,
      vx: ((tx - mx) / d) * t.shotSpeed,
      vy: ((ty - my) / d) * t.shotSpeed,
      age: 0,
      pass: target.roof,
    });
    s.reload = rng.range(t.reloadMin, t.reloadMax);
    s.pose = t.shootPose;
    events.push({ kind: 'soldier-fired', soldier: i });
  });
  return events;
}

function nearest(s: Soldier, people: readonly Exposed[], range: number): Exposed | null {
  let best: Exposed | null = null;
  let bestD = range;
  for (const p of people) {
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d <= bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}
