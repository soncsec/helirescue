import { describe, expect, it } from 'vitest';
import { HUD, TOUCH } from '../../src/config/tuning';
import { dpadAxis, padHit } from '../../src/logic/touch';

const t = { radius: 40, deadZone: 7, grab: 1.3 };

describe('dpadAxis', () => {
  it('gives no input inside the dead zone', () => {
    expect(dpadAxis(0, 0, t)).toEqual({ x: 0, y: 0 });
    expect(dpadAxis(5, -4, t)).toEqual({ x: 0, y: 0 });
    expect(dpadAxis(Number.NaN, 0, t)).toEqual({ x: 0, y: 0 });
  });

  it('reads the four straight directions', () => {
    expect(dpadAxis(30, 0, t)).toEqual({ x: 1, y: 0 });
    expect(dpadAxis(-30, 2, t)).toEqual({ x: -1, y: 0 });
    expect(dpadAxis(0, -30, t)).toEqual({ x: 0, y: -1 });
    expect(dpadAxis(3, 30, t)).toEqual({ x: 0, y: 1 });
  });

  it('reads diagonals in the 45-degree sectors between them', () => {
    expect(dpadAxis(20, -20, t)).toEqual({ x: 1, y: -1 });
    expect(dpadAxis(-20, 20, t)).toEqual({ x: -1, y: 1 });
    // 20 degrees off the x axis is still "right", 25 degrees is "up-right".
    const rad = (deg: number): number => (deg * Math.PI) / 180;
    expect(dpadAxis(30 * Math.cos(rad(20)), -30 * Math.sin(rad(20)), t)).toEqual({ x: 1, y: 0 });
    expect(dpadAxis(30 * Math.cos(rad(25)), -30 * Math.sin(rad(25)), t)).toEqual({ x: 1, y: -1 });
  });

  it('keeps steering when the finger slides past the pad edge', () => {
    expect(dpadAxis(200, 0, t)).toEqual({ x: 1, y: 0 });
  });
});

describe('padHit', () => {
  it('takes a touch on or a little outside the pad', () => {
    expect(padHit(0, 0, t)).toBe(true);
    expect(padHit(40, 0, t)).toBe(true);
    expect(padHit(0, 52, t)).toBe(true); // 1.3 radii
    expect(padHit(0, 53, t)).toBe(false);
    expect(padHit(100, 100, t)).toBe(false);
  });
});

describe('TOUCH tuning', () => {
  it('keeps the pad on screen and clear of the HUD row', () => {
    expect(TOUCH.padX - TOUCH.radius).toBeGreaterThanOrEqual(0);
    expect(TOUCH.padY + TOUCH.radius).toBeLessThanOrEqual(270);
    expect(TOUCH.padY - TOUCH.radius).toBeGreaterThan(40);
    expect(TOUCH.deadZone).toBeLessThan(TOUCH.radius);
    expect(TOUCH.arrow + TOUCH.arrowSize).toBeLessThan(TOUCH.radius);
  });

  it('keeps the pause button on screen, under the HUD text row and away from the pad', () => {
    expect(TOUCH.pauseX + TOUCH.pauseHalf).toBeLessThanOrEqual(480);
    expect(TOUCH.pauseY - TOUCH.pauseHalf).toBeGreaterThan(HUD.textY + HUD.fontSize);
    expect(TOUCH.pauseY + TOUCH.pauseHalf).toBeLessThan(TOUCH.padY - TOUCH.radius);
  });
});
