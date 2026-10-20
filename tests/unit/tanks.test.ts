import { describe, expect, it } from 'vitest';
import { TANKS } from '../../src/config/tuning';
import { hovering } from '../../src/logic/flight';
import type { Heli, HeliMode } from '../../src/logic/landing';
import { createRng } from '../../src/logic/rng';
import {
  elevation,
  hitTank,
  muzzle,
  newArmour,
  tankBox,
  updateTanks,
  type Armour,
  type Tank,
  type TankEvent,
} from '../../src/logic/tanks';
import type { Arena } from '../../src/logic/weapons';

const t = {
  speed: 20,
  range: 220,
  reloadMin: 2,
  reloadMax: 3,
  firstShot: 1,
  hp: 4,
  halfWidth: 46,
  height: 40,
  muzzleX: 45,
  muzzleY: 33,
  minElevation: -10,
  maxElevation: 60,
  shellSpeed: 130,
  shellLife: 2.2,
  shellDamage: 20,
  maxShells: 3,
  turnSeconds: 0.8,
  heliHalfWidth: 26,
  heliHalfHeight: 12,
  hitStep: 4,
};
// An open yard from 400 to 900; a building beyond it at 900..1000, roof 150.
const GROUND = 254;
const arena: Arena = {
  buildings: [{ left: 900, right: 1000, y: 150, base: false }],
  groundY: GROUND,
  width: 1200,
};
const post = { x: 600, y: GROUND, minX: 550, maxX: 650 };
const heli = (x: number, y: number, mode: HeliMode = 'flying'): Heli => ({
  mode,
  flight: hovering(x, y),
  facing: 1,
  health: 100,
  on: null,
  crashedFor: 0,
});
// Far away and high: out of range.
const away = heli(100, 40);

/** The first tank (fails the test if there is none). */
function first(a: Armour): Tank {
  const k = a.tanks[0];
  if (!k) throw new Error('no tank');
  return k;
}

function run(a: Armour, h: Heli, seconds: number, seed = 1): TankEvent[] {
  const rng = createRng(seed);
  const events: TankEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...updateTanks(a, h, 1 / 60, arena, t, rng));
  }
  return events;
}

describe('tanks', () => {
  it('patrol their stretch of street, turning at each end', () => {
    const a = newArmour([post], t);
    const k = a.tanks[0];
    run(a, away, 2);
    expect(k?.x).toBeCloseTo(640, 0);
    expect(k?.facing).toBe(1);
    run(a, away, 1);
    expect(k?.x).toBe(650);
    expect(k?.facing).toBe(-1);
    // It reached the end at 2.5 s and turns for 0.8 s (until 3.3 s), then
    // drives back: 2.5 s later it is 50 px back.
    run(a, away, 0.3);
    expect(k?.x).toBeCloseTo(650, 0);
    run(a, away, 2.5);
    expect(k?.x).toBeCloseTo(600, 0);
    for (let i = 0; i < 30; i++) {
      run(a, away, 1);
      expect(k?.x).toBeGreaterThanOrEqual(post.minX);
      expect(k?.x).toBeLessThanOrEqual(post.maxX);
    }
  });

  it('stop and fire up at a low helicopter in range, after the first-shot delay', () => {
    const a = newArmour([post], t);
    const h = heli(740, 160);
    expect(run(a, h, 0.9)).toEqual([]);
    expect(a.tanks[0]?.engaged).toBe(true);
    const x = a.tanks[0]?.x;
    const events = run(a, h, 0.2);
    expect(events).toEqual([{ kind: 'tank-fired', tank: 0, ...muzzle(first(a), t) }]);
    expect(a.tanks[0]?.x).toBe(x); // stopped
    const shell = a.shells.find((s) => s.alive);
    expect(shell?.vx).toBeGreaterThan(0);
    expect(shell?.vy).toBeLessThan(0);
    expect(Math.hypot(shell?.vx ?? 0, shell?.vy ?? 0)).toBeCloseTo(t.shellSpeed);
  });

  it('hit the helicopter for shell damage', () => {
    const a = newArmour([post], t);
    const events = run(a, heli(740, 200), 3);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'heli-hit', damage: t.shellDamage }),
    );
  });

  it('can hit a helicopter landed in the yard', () => {
    const a = newArmour([post], t);
    const events = run(a, heli(760, GROUND - 24, 'landed'), 3);
    expect(events.some((e) => e.kind === 'heli-hit')).toBe(true);
  });

  it('turn around to face a helicopter behind them before firing', () => {
    const a = newArmour([post], t); // facing right
    const h = heli(470, 180);
    const early = run(a, h, 1.5);
    expect(a.tanks[0]?.facing).toBe(-1);
    expect(early.filter((e) => e.kind === 'tank-fired')).toHaveLength(1);
    // Fired only once the turn was done (0.8 s) and the delay (1 s) had passed.
    const a2 = newArmour([post], t);
    expect(run(a2, h, 0.95).filter((e) => e.kind === 'tank-fired')).toHaveLength(0);
  });

  it('cannot reach a helicopter high above them or out of range', () => {
    const above = newArmour([post], t);
    // Straight above the barrel: far steeper than the barrel reaches.
    const m = muzzle(first(above), t);
    expect(elevation(first(above), t, m.x + 20, m.y - 150)).toBeGreaterThan(t.maxElevation);
    expect(run(above, heli(m.x + 20, m.y - 150), 5)).toEqual([]);
    const far = newArmour([post], t);
    expect(run(far, heli(900, 60), 5)).toEqual([]);
    // A wreck is not shot at.
    const wreck = newArmour([post], t);
    expect(run(wreck, heli(740, 200, 'crashed'), 5)).toEqual([]);
  });

  it('measures elevation the way the barrel faces', () => {
    const k = first(newArmour([post], t));
    const m = muzzle(k, t);
    expect(elevation(k, t, m.x + 100, m.y)).toBeCloseTo(0);
    expect(elevation(k, t, m.x + 100, m.y - 100)).toBeCloseTo(45);
    k.facing = -1;
    const back = muzzle(k, t);
    expect(back.x).toBe(k.x - t.muzzleX);
    expect(elevation(k, t, back.x - 100, back.y - 100)).toBeCloseTo(45);
  });

  it('shells burst on buildings and the street, and the pool never grows', () => {
    const a = newArmour([post], t);
    // Behind the building's wall: shells burst on it.
    const events = run(a, heli(780, 120), 8);
    expect(events.filter((e) => e.kind === 'tank-fired').length).toBeGreaterThan(1);
    expect(a.shells).toHaveLength(t.maxShells);
  });

  it('take bullet hits and are destroyed by enough of them', () => {
    const a = newArmour([post], t);
    for (let i = 1; i < t.hp; i++) expect(hitTank(a, 0, 1)).toBeNull();
    expect(hitTank(a, 0, 1)).toEqual({ kind: 'tank-destroyed', tank: 0, x: 600, y: GROUND });
    expect(a.tanks[0]?.alive).toBe(false);
    expect(tankBox(first(a), t)).toBeNull();
    expect(hitTank(a, 0, 1)).toBeNull();
    expect(hitTank(a, 5, 1)).toBeNull();
    // A destroyed tank neither drives nor fires.
    expect(run(a, heli(740, 160), 5)).toEqual([]);
  });

  it('have a hit box over the hull', () => {
    const k = first(newArmour([post], t));
    expect(tankBox(k, t)).toEqual({ left: 554, right: 646, top: GROUND - 40, bottom: GROUND });
  });
});

describe('tank tuning', () => {
  it('a shell hurts more than flak, and five crash a full-health helicopter', () => {
    expect(TANKS.shellDamage * 5).toBeGreaterThanOrEqual(100);
    expect(TANKS.shellDamage * 4).toBeLessThan(100);
  });

  it('the barrel tip is inside the drawn tank, and the hit box within it', () => {
    expect(TANKS.muzzleX).toBeLessThan(TANKS.spriteHalfWidth);
    expect(TANKS.halfWidth).toBeLessThanOrEqual(TANKS.spriteHalfWidth);
    expect(TANKS.minElevation).toBeLessThan(0);
    expect(TANKS.maxElevation).toBeLessThan(90);
  });

  it('shells reach about the firing range', () => {
    expect(TANKS.shellSpeed * TANKS.shellLife).toBeGreaterThan(TANKS.range);
  });
});
