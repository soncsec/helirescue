/**
 * Arcade helicopter flight (H2): tilt, thrust, drag and light gravity.
 * Plain TypeScript, unit tested; every number comes from FlightTuning.
 */
import type { Axis, Bounds } from './movement';

export interface FlightState {
  x: number;
  y: number;
  /** Velocity in pixels per second (y grows downward). */
  vx: number;
  vy: number;
  /** Body tilt in degrees: positive leans right (nose down when flying right). */
  tilt: number;
}

export interface FlightTuning {
  /** Largest tilt in degrees. */
  maxTilt: number;
  /** How fast the body tilts toward the target, degrees per second. */
  tiltRate: number;
  /** Sideways acceleration at full tilt, px/s². */
  thrust: number;
  /** Sideways drag per second; top speed is thrust / dragX. */
  dragX: number;
  /** Upward acceleration while climbing, px/s². */
  lift: number;
  /** Extra downward acceleration while descending, px/s². */
  descend: number;
  /** Always pulls down, px/s²; with no input the helicopter sinks slowly. */
  gravity: number;
  /** Vertical drag per second. */
  dragY: number;
  /** Longest single physics step in seconds; longer frames are split. */
  maxStep: number;
}

/** A helicopter at rest at (x, y). */
export function hovering(x: number, y: number): FlightState {
  return { x, y, vx: 0, vy: 0, tilt: 0 };
}

function moveToward(value: number, target: number, maxChange: number): number {
  if (value < target) return Math.min(target, value + maxChange);
  return Math.max(target, value - maxChange);
}

function stepOnce(
  s: FlightState,
  input: Axis,
  dt: number,
  t: FlightTuning,
  b: Bounds,
): FlightState {
  const tilt = moveToward(s.tilt, input.x * t.maxTilt, t.tiltRate * dt);
  const ax = (tilt / t.maxTilt) * t.thrust - s.vx * t.dragX;
  const push = input.y < 0 ? -t.lift : input.y > 0 ? t.descend : 0;
  const ay = push + t.gravity - s.vy * t.dragY;

  let vx = s.vx + ax * dt;
  let vy = s.vy + ay * dt;
  let x = s.x + vx * dt;
  let y = s.y + vy * dt;
  // Stop at the edges of the world.
  if (x < b.minX || x > b.maxX) {
    x = Math.min(b.maxX, Math.max(b.minX, x));
    vx = 0;
  }
  if (y < b.minY || y > b.maxY) {
    y = Math.min(b.maxY, Math.max(b.minY, y));
    vy = 0;
  }
  return { x, y, vx, vy, tilt };
}

/**
 * Advances the helicopter by `dt` seconds. Long frames are split into steps of
 * at most `maxStep`, so a slow frame gives the same flight as several fast ones.
 */
export function fly(
  s: FlightState,
  input: Axis,
  dt: number,
  tuning: FlightTuning,
  bounds: Bounds,
): FlightState {
  if (!(dt >= 0)) throw new RangeError('dt must not be negative');
  if (!(tuning.maxStep > 0)) throw new RangeError('maxStep must be positive');
  let state = s;
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(left, tuning.maxStep);
    state = stepOnce(state, input, h, tuning, bounds);
    left -= h;
  }
  return state;
}

/** The speed the helicopter settles at when flying flat out sideways. */
export function topSpeed(t: FlightTuning): number {
  return t.thrust / t.dragX;
}
