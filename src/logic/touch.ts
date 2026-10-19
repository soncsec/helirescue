/**
 * Touch D-pad rules (roadmap M2.6): turns a finger's offset from the pad's
 * centre into an 8-way movement axis. Plain TypeScript, unit tested; the
 * drawing and pointer handling live in src/scenes/touchControls.ts.
 */
import type { Axis } from './movement';

export interface TouchTuning {
  /** Pad radius and the dead zone around its centre, in game pixels. */
  radius: number;
  deadZone: number;
  /** A touch may start this many radii from the centre and still grab the pad. */
  grab: number;
}

/** Shared between the touch controls (writer) and the game scene (reader). */
export interface TouchState {
  axis: Axis;
  /** Set by the pause button; the game scene clears it when it pauses. */
  pause: boolean;
  /** Set by the Turn button; the game scene clears it when it turns. */
  turn: boolean;
}

/** True when a touch at offset (dx, dy) from a round button's centre presses it. */
export function buttonHit(dx: number, dy: number, r: number): boolean {
  return Math.hypot(dx, dy) <= r;
}

/** The pad is split into 8 equal sectors: a direction counts beyond sin(22.5°) of the distance. */
const SECTOR = Math.sin(Math.PI / 8);

/** True when a touch at offset (dx, dy) from the pad centre should take hold of it. */
export function padHit(dx: number, dy: number, t: TouchTuning): boolean {
  return Math.hypot(dx, dy) <= t.radius * t.grab;
}

/** The 8-way axis for a finger at offset (dx, dy) from the pad centre; centred is no input. */
export function dpadAxis(dx: number, dy: number, t: TouchTuning): Axis {
  const dist = Math.hypot(dx, dy);
  if (!(dist > t.deadZone)) return { x: 0, y: 0 };
  const limit = dist * SECTOR;
  return {
    x: dx > limit ? 1 : dx < -limit ? -1 : 0,
    y: dy > limit ? 1 : dy < -limit ? -1 : 0,
  };
}
