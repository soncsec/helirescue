/**
 * Landing rules (H3): touching down on roofs and the street, hard landings,
 * bumping into walls, never landing on people, and crashing.
 * Plain TypeScript, unit tested; numbers come from LandingTuning and HeliShape.
 */
import { fly, hovering, type FlightState, type FlightTuning } from './flight';
import type { Axis, Bounds } from './movement';
import type { Roof } from './world';

/** `landing` means flying slowly just above somewhere it could land. */
export type HeliMode = 'flying' | 'landing' | 'landed' | 'crashed';

/** The helicopter's outline around its centre, for the side view facing right. */
export interface HeliShape {
  /** Skid bottom, below the centre. */
  bottom: number;
  /** Skids: how far they reach behind and in front of the centre. */
  skidBack: number;
  skidFront: number;
  /** Lower body, which hits walls: reach behind and in front, and height above the skids. */
  bodyBack: number;
  bodyFront: number;
  bodyHeight: number;
}

export interface LandingTuning {
  maxHealth: number;
  /** Touch-down speeds up to this (px/s) are safe. */
  safeSpeed: number;
  /** Health lost per px/s above safeSpeed. */
  damagePerSpeed: number;
  /** Below this height over a landing spot, a slow descent counts as `landing`. */
  landingZone: number;
  /** Seconds after a crash before a new helicopter appears at base. */
  respawnSeconds: number;
  /**
   * Flare (owner, 2026-10-19): within this height over a landing spot the
   * helicopter slows its own descent to flareSpeed, so holding Down lands gently.
   */
  flareZone: number;
  flareSpeed: number;
  /** Touching down moving sideways faster than this (px/s) is a hard landing. */
  safeSideSpeed: number;
  /** Health lost per px/s of sideways speed above safeSideSpeed. */
  sideDamagePerSpeed: number;
  /**
   * Flying into the side of a building (owner's play-test, 2026-10-20): hitting
   * it faster than bumpSafeSpeed (px/s) costs bumpDamagePerSpeed health per px/s above it.
   */
  bumpSafeSpeed: number;
  bumpDamagePerSpeed: number;
}

/** Something the helicopter may not land on: a person, standing on a surface. */
export interface Blocker {
  x: number;
  halfWidth: number;
  /** Top of the person's head. */
  top: number;
}

export interface Heli {
  mode: HeliMode;
  flight: FlightState;
  /** 1 facing right, -1 facing left. */
  facing: 1 | -1;
  health: number;
  /** Where it is landed, or null. */
  on: Roof | null;
  /** Seconds since the crash (crashed mode only). */
  crashedFor: number;
}

/** What happened this step, for sounds, effects and the e2e test hook. */
export type HeliEvent =
  | { kind: 'none' }
  | { kind: 'took-off' }
  | { kind: 'landed'; on: Roof; speed: number }
  | { kind: 'hard-landing'; on: Roof; speed: number; damage: number }
  | { kind: 'blocked' }
  /** Flew into a building's side; `damage` is 0 for a gentle touch. */
  | { kind: 'bumped'; damage: number }
  | { kind: 'crashed' }
  | { kind: 'respawned' }
  /** Shot by the enemy (flak); `crashed` instead when it takes the last of the health. */
  | { kind: 'hit'; damage: number };

export interface HeliWorld {
  /** Roofs and the street (the street is a surface the width of the world). */
  surfaces: readonly Roof[];
  /** Solid buildings: the roofs that are not the street. */
  buildings: readonly Roof[];
  /** Top of the street: the bottom of every building. */
  groundY: number;
  people: readonly Blocker[];
  bounds: Bounds;
  /** Where a new helicopter appears after a crash. */
  spawn: { x: number; y: number };
}

export interface HeliRules {
  flight: FlightTuning;
  landing: LandingTuning;
  shape: HeliShape;
}

/** A new helicopter hovering at (x, y), facing right, full health. */
export function newHeli(x: number, y: number, t: LandingTuning): Heli {
  return {
    mode: 'flying',
    flight: hovering(x, y),
    facing: 1,
    health: t.maxHealth,
    on: null,
    crashedFor: 0,
  };
}

/**
 * Damage from enemy fire. With no health left it crashes where it is, through
 * the same crashed state as a hard landing, so lives and respawn work the same.
 */
export function hitHeli(h: Heli, damage: number): { heli: Heli; event: HeliEvent } {
  if (h.mode === 'crashed' || !(damage > 0)) return { heli: h, event: { kind: 'none' } };
  const health = Math.max(0, h.health - damage);
  if (health === 0) {
    return {
      heli: { ...h, mode: 'crashed', health, on: null, crashedFor: 0 },
      event: { kind: 'crashed' },
    };
  }
  return { heli: { ...h, health }, event: { kind: 'hit', damage } };
}

/** Left and right of a part that reaches `back` behind and `front` ahead of x. */
export function span(x: number, facing: 1 | -1, back: number, front: number): [number, number] {
  return facing === 1 ? [x - back, x + front] : [x - front, x + back];
}

/** Damage for touching down at `speed`: none up to safeSpeed, then linear. */
export function landingDamage(speed: number, t: LandingTuning): number {
  return speed <= t.safeSpeed ? 0 : Math.ceil((speed - t.safeSpeed) * t.damagePerSpeed);
}

/** Damage for touching down while moving sideways at `vx`: none up to safeSideSpeed. */
export function sideDamage(vx: number, t: LandingTuning): number {
  const speed = Math.abs(vx);
  return speed <= t.safeSideSpeed ? 0 : Math.ceil((speed - t.safeSideSpeed) * t.sideDamagePerSpeed);
}

/** Health lost flying into a building's side at `impact` px/s (owner, 2026-10-20). */
export function bumpDamage(impact: number, t: LandingTuning): number {
  return impact <= t.bumpSafeSpeed
    ? 0
    : Math.ceil((impact - t.bumpSafeSpeed) * t.bumpDamagePerSpeed);
}

/**
 * The flare: over a spot it could land on, within flareZone, the descent is
 * held to flareSpeed (owner, 2026-10-19). Returns the flight unchanged elsewhere.
 */
export function flare(
  prev: FlightState,
  next: FlightState,
  facing: 1 | -1,
  dt: number,
  world: HeliWorld,
  rules: HeliRules,
): FlightState {
  const t = rules.landing;
  if (next.vy <= t.flareSpeed) return next;
  const bottom = next.y + rules.shape.bottom;
  const skids = span(next.x, facing, rules.shape.skidBack, rules.shape.skidFront);
  const over = world.surfaces.some(
    (s) => s.y >= bottom - next.vy * dt && s.y - bottom <= t.flareZone && supports(s, skids),
  );
  if (!over) return next;
  return { ...next, vy: t.flareSpeed, y: Math.min(next.y, prev.y + t.flareSpeed * dt) };
}

/** True when both skids would rest on this surface. */
function supports(s: Roof, skids: [number, number]): boolean {
  return skids[0] >= s.left && skids[1] <= s.right;
}

/**
 * Settles the helicopter after a flight step from `prev` to `next`:
 * stops it at walls, rests it on people's heads, or lands it.
 */
function settle(
  prev: FlightState,
  next: FlightState,
  facing: 1 | -1,
  world: HeliWorld,
  shape: HeliShape,
): {
  flight: FlightState;
  touched: Roof | null;
  blocked: boolean;
  bumped: boolean;
  /** How fast it was flying into the wall it hit (px/s), 0 if none. */
  impact: number;
} {
  let f = next;
  let bumped = false;
  let impact = 0;

  // Walls: push the lower body out of any building it has moved into.
  for (const b of world.buildings) {
    const bottom = f.y + shape.bottom;
    const [left, right] = span(f.x, facing, shape.bodyBack, shape.bodyFront);
    const inside =
      bottom > b.y && bottom - shape.bodyHeight < world.groundY && right > b.left && left < b.right;
    if (!inside) continue;
    const prevBottom = prev.y + shape.bottom;
    if (prevBottom <= b.y && supports(b, span(f.x, facing, shape.skidBack, shape.skidFront))) {
      continue; // coming down onto this roof: landing handles it
    }
    // Move out the shorter way.
    const pushLeft = right - b.left;
    const pushRight = b.right - left;
    const intoLeft = pushLeft < pushRight;
    const x = intoLeft ? f.x - pushLeft : f.x + pushRight;
    // Pushed back left means it was flying right into the wall, and the other way round.
    impact = Math.max(impact, intoLeft ? f.vx : -f.vx, 0);
    f = { ...f, x, vx: 0 };
    bumped = true;
  }

  const prevBottom = prev.y + shape.bottom;
  const bottom = f.y + shape.bottom;
  const skids = span(f.x, facing, shape.skidBack, shape.skidFront);

  // People: the skids may not come down on anyone. Rest just above them.
  for (const p of world.people) {
    const overlaps = skids[0] < p.x + p.halfWidth && skids[1] > p.x - p.halfWidth;
    if (overlaps && prevBottom <= p.top + 1e-6 && bottom >= p.top) {
      return {
        flight: { ...f, y: p.top - shape.bottom, vy: Math.min(0, f.vy) },
        touched: null,
        blocked: true,
        bumped,
        impact,
      };
    }
  }

  // Surfaces: land on the highest one passed through this step.
  let touched: Roof | null = null;
  for (const s of world.surfaces) {
    if (prevBottom <= s.y + 1e-6 && bottom >= s.y && supports(s, skids)) {
      if (!touched || s.y < touched.y) touched = s;
    }
  }
  return { flight: f, touched, blocked: false, bumped, impact };
}

/** True when a landing spot is just below and the helicopter is coming down. */
function nearLanding(h: Heli, world: HeliWorld, rules: HeliRules): boolean {
  const { flight: f, facing } = h;
  if (f.vy < 0) return false;
  const bottom = f.y + rules.shape.bottom;
  const skids = span(f.x, facing, rules.shape.skidBack, rules.shape.skidFront);
  return world.surfaces.some(
    (s) => s.y >= bottom && s.y - bottom <= rules.landing.landingZone && supports(s, skids),
  );
}

/**
 * Advances the helicopter by `dt` seconds of input. It faces the way it flies
 * once it moves sideways faster than `turnSpeed` (owner's play-test,
 * 2026-10-20); slower, it keeps its facing, so small nudges while hovering do
 * not flip it. `turn` (the Turn key, H2 as amended 2026-10-18) flips it while
 * slower than that. It can only turn in the air; landed, it shows its front view.
 */
export function updateHeli(
  h: Heli,
  input: Axis,
  dt: number,
  world: HeliWorld,
  rules: HeliRules,
  turn = false,
): { heli: Heli; event: HeliEvent } {
  if (h.mode === 'crashed') {
    const crashedFor = h.crashedFor + dt;
    if (crashedFor < rules.landing.respawnSeconds) {
      return { heli: { ...h, crashedFor }, event: { kind: 'none' } };
    }
    return {
      heli: newHeli(world.spawn.x, world.spawn.y, rules.landing),
      event: { kind: 'respawned' },
    };
  }

  if (h.mode === 'landed') {
    if (input.y >= 0) return { heli: h, event: { kind: 'none' } };
    const flight = fly(h.flight, { x: 0, y: -1 }, dt, rules.flight, world.bounds);
    return { heli: { ...h, mode: 'flying', flight, on: null }, event: { kind: 'took-off' } };
  }

  const flown = fly(h.flight, input, dt, rules.flight, world.bounds);
  const turned: 1 | -1 = turn ? (h.facing === 1 ? -1 : 1) : h.facing;
  const ts = rules.flight.turnSpeed;
  const facing: 1 | -1 = flown.vx >= ts ? 1 : flown.vx <= -ts ? -1 : turned;
  const next = flare(h.flight, flown, facing, dt, world, rules);
  const s = settle(h.flight, next, facing, world, rules.shape);

  if (s.touched) {
    const speed = s.flight.vy;
    const damage = landingDamage(speed, rules.landing) + sideDamage(s.flight.vx, rules.landing);
    const health = Math.max(0, h.health - damage);
    const rest: FlightState = {
      x: s.flight.x,
      y: s.touched.y - rules.shape.bottom,
      vx: 0,
      vy: 0,
      tilt: 0,
    };
    if (health === 0) {
      return {
        heli: { ...h, mode: 'crashed', flight: rest, facing, health, on: null, crashedFor: 0 },
        event: { kind: 'crashed' },
      };
    }
    const heli: Heli = { ...h, mode: 'landed', flight: rest, facing, health, on: s.touched };
    return damage > 0
      ? { heli, event: { kind: 'hard-landing', on: s.touched, speed, damage } }
      : { heli, event: { kind: 'landed', on: s.touched, speed } };
  }

  const moved: Heli = { ...h, flight: s.flight, facing, mode: 'flying' };
  const bump = s.bumped ? bumpDamage(s.impact, rules.landing) : 0;
  if (bump > 0) {
    moved.health = Math.max(0, h.health - bump);
    if (moved.health === 0) {
      return {
        heli: { ...moved, mode: 'crashed', on: null, crashedFor: 0 },
        event: { kind: 'crashed' },
      };
    }
  }
  moved.mode = nearLanding(moved, world, rules) ? 'landing' : 'flying';
  const event: HeliEvent = s.blocked
    ? { kind: 'blocked' }
    : s.bumped
      ? { kind: 'bumped', damage: bump }
      : { kind: 'none' };
  return { heli: moved, event };
}
