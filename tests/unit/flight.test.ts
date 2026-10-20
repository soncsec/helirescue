import { describe, expect, it } from 'vitest';
import { FLIGHT } from '../../src/config/tuning';
import { fly, hovering, topSpeed, type FlightState } from '../../src/logic/flight';
import type { Axis } from '../../src/logic/movement';

const t = {
  maxTilt: 12,
  tiltRate: 60,
  thrust: 260,
  dragX: 1.6,
  lift: 300,
  descend: 200,
  gravity: 30,
  dragY: 2.5,
  maxStep: 1 / 120,
  turnSpeed: 40,
};
const bounds = { minX: 0, maxX: 10_000, minY: 0, maxY: 10_000 };
const none: Axis = { x: 0, y: 0 };
const right: Axis = { x: 1, y: 0 };
const up: Axis = { x: 0, y: -1 };
const down: Axis = { x: 0, y: 1 };
const start = hovering(5000, 5000);

/** Flies for `seconds` in steps of `frame` seconds. */
function hold(s: FlightState, input: Axis, seconds: number, frame = 1 / 60): FlightState {
  let state = s;
  for (let i = 0; i < Math.round(seconds / frame); i++) state = fly(state, input, frame, t, bounds);
  return state;
}

describe('fly: sideways', () => {
  it('tilts toward the input, no further than maxTilt', () => {
    expect(hold(start, right, 0.1).tilt).toBeCloseTo(6);
    expect(hold(start, right, 2).tilt).toBe(12);
    expect(hold(start, { x: -1, y: 0 }, 2).tilt).toBe(-12);
  });

  it('speeds up gradually to its top speed and no faster', () => {
    const early = hold(start, right, 0.25);
    expect(early.vx).toBeGreaterThan(0);
    expect(early.vx).toBeLessThan(topSpeed(t) / 2);
    const later = hold(start, right, 6);
    expect(later.vx).toBeCloseTo(topSpeed(t), 0);
    expect(hold(later, right, 4).vx).toBeLessThanOrEqual(topSpeed(t));
  });

  it('levels out and drifts to a stop when the key is released', () => {
    const moving = hold(start, right, 3);
    const after = hold(moving, none, 0.5);
    expect(after.tilt).toBeLessThan(moving.tilt);
    expect(after.vx).toBeLessThan(moving.vx);
    expect(after.x).toBeGreaterThan(moving.x); // drifts, not an instant stop
    const stopped = hold(moving, none, 6);
    expect(stopped.tilt).toBe(0);
    expect(Math.abs(stopped.vx)).toBeLessThan(1);
  });

  it('reverses smoothly through level flight', () => {
    const moving = hold(start, right, 3);
    const turning = hold(moving, { x: -1, y: 0 }, 0.1);
    expect(turning.vx).toBeGreaterThan(0); // still moving right for a moment
    expect(hold(moving, { x: -1, y: 0 }, 3).vx).toBeLessThan(0);
  });
});

describe('fly: up and down', () => {
  it('climbs when up is held', () => {
    const s = hold(start, up, 1);
    expect(s.vy).toBeLessThan(-50);
    expect(s.y).toBeLessThan(start.y - 30);
  });

  it('sinks slowly with no input (light gravity)', () => {
    const s = hold(start, none, 3);
    expect(s.vy).toBeGreaterThan(0);
    expect(s.vy).toBeCloseTo(t.gravity / t.dragY, 0);
  });

  it('descends faster when down is held', () => {
    expect(hold(start, down, 1).vy).toBeGreaterThan(hold(start, none, 1).vy * 3);
  });
});

describe('fly: edges and timing', () => {
  it('stops at the edges of the world and loses speed there', () => {
    const small = { minX: 50, maxX: 150, minY: 50, maxY: 150 };
    let s = hovering(100, 100);
    for (let i = 0; i < 300; i++) s = fly(s, { x: 1, y: 1 }, 1 / 60, t, small);
    expect(s).toMatchObject({ x: 150, y: 150, vx: 0, vy: 0 });
    for (let i = 0; i < 300; i++) s = fly(s, { x: -1, y: -1 }, 1 / 60, t, small);
    expect(s).toMatchObject({ x: 50, y: 50, vx: 0, vy: 0 });
  });

  it('gives the same flight at 30, 60 and 144 frames per second', () => {
    const a = hold(start, right, 2, 1 / 30);
    const b = hold(start, right, 2, 1 / 60);
    const c = hold(start, right, 2, 1 / 144);
    expect(a.x).toBeCloseTo(b.x, 0);
    expect(c.x).toBeCloseTo(b.x, 0);
  });

  it('splits a long frame into small steps', () => {
    const once = fly(start, right, 1, t, bounds);
    const many = hold(start, right, 1, t.maxStep);
    expect(once.x).toBeCloseTo(many.x, 6);
  });

  it('does nothing over zero time', () => {
    expect(fly(start, right, 0, t, bounds)).toEqual(start);
  });

  it('rejects negative time and a bad step size', () => {
    expect(() => fly(start, right, -1, t, bounds)).toThrow(RangeError);
    expect(() => fly(start, right, Number.NaN, t, bounds)).toThrow(RangeError);
    expect(() => fly(start, right, 1, { ...t, maxStep: 0 }, bounds)).toThrow(RangeError);
  });
});

describe('FLIGHT tuning', () => {
  it('can cross one screen in under 4 seconds', () => {
    expect(480 / topSpeed(FLIGHT)).toBeLessThan(4);
  });

  it('climbs faster than it sinks, and sinks slowly enough to steer onto a roof', () => {
    const climb = (FLIGHT.lift - FLIGHT.gravity) / FLIGHT.dragY;
    const sink = FLIGHT.gravity / FLIGHT.dragY;
    expect(climb).toBeGreaterThan(sink * 4);
    expect(sink).toBeLessThan(20);
  });
});
