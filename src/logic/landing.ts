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
  | { kind: 'bumped' }
  | { kind: 'crashed' }
  | { kind: 'respawned' };

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

/** Left and right of a part that reaches `back` behind and `front` ahead of x. */
export function span(x: number, facing: 1 | -1, back: number, front: number): [number, number] {
  return facing === 1 ? [x - back, x + front] : [x - front, x + back];
}

/** Damage for touching down at `speed`: none up to safeSpeed, then linear. */
export function landingDamage(speed: number, t: LandingTuning): number {
  return speed <= t.safeSpeed ? 0 : Math.ceil((speed - t.safeSpeed) * t.damagePerSpeed);
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
): { flight: FlightState; touched: Roof | null; blocked: boolean; bumped: boolean } {
  let f = next;
  let bumped = false;

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
    const x = pushLeft < pushRight ? f.x - pushLeft : f.x + pushRight;
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
  return { flight: f, touched, blocked: false, bumped };
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

/** Advances the helicopter by `dt` seconds of input. */
export function updateHeli(
  h: Heli,
  input: Axis,
  dt: number,
  world: HeliWorld,
  rules: HeliRules,
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

  const facing: 1 | -1 = input.x === 0 ? h.facing : input.x;
  const next = fly(h.flight, input, dt, rules.flight, world.bounds);
  const s = settle(h.flight, next, facing, world, rules.shape);

  if (s.touched) {
    const speed = s.flight.vy;
    const damage = landingDamage(speed, rules.landing);
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
  moved.mode = nearLanding(moved, world, rules) ? 'landing' : 'flying';
  const event: HeliEvent = s.blocked
    ? { kind: 'blocked' }
    : s.bumped
      ? { kind: 'bumped' }
      : { kind: 'none' };
  return { heli: moved, event };
}
