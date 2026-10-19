import { describe, expect, it } from 'vitest';
import { ENEMIES, LANDING } from '../../src/config/tuning';
import {
  aimFrame,
  gunBox,
  hitGun,
  newEnemies,
  updateEnemies,
  type EnemyEvent,
  type Enemies,
} from '../../src/logic/enemies';
import { hovering } from '../../src/logic/flight';
import { hitHeli, type Heli, type HeliMode } from '../../src/logic/landing';
import { createRng } from '../../src/logic/rng';
import type { Arena } from '../../src/logic/weapons';

const t = {
  aaRange: 200,
  aaReloadMin: 2,
  aaReloadMax: 3,
  firstShot: 1,
  aaHp: 3,
  gunHalfWidth: 18,
  gunHeight: 24,
  muzzleY: 22,
  flakSpeed: 150,
  flakLife: 2,
  flakDamage: 15,
  maxFlak: 4,
  heliHalfWidth: 26,
  heliHalfHeight: 12,
  hitStep: 4,
};
// A gun on a roof at y 150 (building 500..600); the street at 254.
const arena: Arena = {
  buildings: [{ left: 500, right: 600, y: 150, base: false }],
  groundY: 254,
  width: 1200,
};
const gun = { x: 550, y: 150 };
const heli = (x: number, y: number, mode: HeliMode = 'flying'): Heli => ({
  mode,
  flight: hovering(x, y),
  facing: 1,
  health: 100,
  on: null,
  crashedFor: 0,
});

function run(e: Enemies, h: Heli, seconds: number, seed = 1): EnemyEvent[] {
  const rng = createRng(seed);
  const events: EnemyEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...updateEnemies(e, h, 1 / 60, arena, t, rng));
  }
  return events;
}

describe('aimFrame', () => {
  it('points left, up and right across the five frames', () => {
    expect(aimFrame(-100, 0)).toBe(0);
    expect(aimFrame(-100, -100)).toBe(1);
    expect(aimFrame(0, -100)).toBe(2);
    expect(aimFrame(100, -100)).toBe(3);
    expect(aimFrame(100, 0)).toBe(4);
    expect(aimFrame(100, 50)).toBe(4); // below: level
  });
});

describe('anti-aircraft guns', () => {
  it('wait out the first-shot delay, then fire at a helicopter in range', () => {
    const e = newEnemies([gun], t);
    expect(run(e, heli(600, 40), 0.9)).toEqual([]);
    const events = run(e, heli(600, 40), 0.2);
    expect(events).toEqual([{ kind: 'flak', gun: 0 }]);
    const shell = e.flak.find((s) => s.alive);
    expect(shell?.vx).toBeGreaterThan(0); // toward the helicopter, up and right
    expect(shell?.vy).toBeLessThan(0);
    expect(e.guns[0]?.aim).toBe(3);
  });

  it('hold fire when the helicopter is out of range, below the gun, or wrecked', () => {
    expect(run(newEnemies([gun], t), heli(900, 40), 3)).toEqual([]); // 350 px away
    expect(run(newEnemies([gun], t), heli(620, 200), 3)).toEqual([]); // below the muzzle
    expect(run(newEnemies([gun], t), heli(600, 40, 'crashed'), 3)).toEqual([]);
  });

  it('reload for a random 2 to 3 seconds from the seeded RNG, the same each run', () => {
    const times = (seed: number): number[] => {
      const e = newEnemies([gun], t);
      const rng = createRng(seed);
      const out: number[] = [];
      for (let i = 0; i < 60 * 10; i++) {
        const ev = updateEnemies(e, heli(560, 60), 1 / 60, arena, { ...t, flakLife: 0.01 }, rng);
        if (ev.some((x) => x.kind === 'flak')) out.push(i);
      }
      return out;
    };
    const a = times(7);
    expect(a).toEqual(times(7));
    for (let i = 1; i < a.length; i++) {
      const gap = ((a[i] ?? 0) - (a[i - 1] ?? 0)) / 60;
      expect(gap).toBeGreaterThanOrEqual(2 - 1 / 60);
      expect(gap).toBeLessThanOrEqual(3 + 1 / 60);
    }
  });

  it('hits the helicopter it aimed at', () => {
    const e = newEnemies([gun], t);
    const events = run(e, heli(560, 50), 2.5);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'heli-hit', damage: 15 }));
  });

  it('flak that misses bursts on a building or runs out of time', () => {
    const e = newEnemies([gun], t);
    run(e, heli(600, 40), 1.05); // fired at (600, 40)
    // The helicopter moved away: the shell flies on and bursts in the air.
    const events = run(e, heli(1100, 40), 2.1);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'burst' }));
    expect(e.flak.every((s) => !s.alive)).toBe(true);
  });

  it('keep a fixed flak pool', () => {
    const e = newEnemies([gun, { x: 520, y: 150 }, { x: 580, y: 150 }], { ...t, maxFlak: 2 });
    const before = [...e.flak];
    run(e, heli(560, 60), 6);
    expect(e.flak).toHaveLength(2);
    expect(e.flak.every((s, i) => s === before[i])).toBe(true);
  });

  it('are destroyed after aaHp hits, and dead guns stop firing', () => {
    const e = newEnemies([gun], t);
    expect(hitGun(e, 0, 1)).toBeNull();
    expect(hitGun(e, 0, 1)).toBeNull();
    expect(hitGun(e, 0, 1)).toEqual({ kind: 'gun-destroyed', gun: 0, x: 550, y: 150 });
    expect(hitGun(e, 0, 1)).toBeNull();
    const g = e.guns[0];
    if (!g) throw new Error('no gun');
    expect(gunBox(g, t)).toBeNull();
    expect(run(e, heli(600, 40), 5)).toEqual([]);
  });

  it('have a hit box standing on the roof', () => {
    const g = newEnemies([gun], t).guns[0];
    if (!g) throw new Error('no gun');
    expect(gunBox(g, t)).toEqual({ left: 532, right: 568, top: 126, bottom: 150 });
  });
});

describe('hitHeli', () => {
  it('takes health, and crashes the helicopter when none is left', () => {
    const h = heli(100, 100);
    expect(hitHeli(h, 15)).toEqual({
      heli: { ...h, health: 85 },
      event: { kind: 'hit', damage: 15 },
    });
    const r = hitHeli({ ...h, health: 10 }, 15);
    expect(r.event).toEqual({ kind: 'crashed' });
    expect(r.heli).toMatchObject({ mode: 'crashed', health: 0, crashedFor: 0 });
    expect(hitHeli(r.heli, 15).event).toEqual({ kind: 'none' });
  });
});

describe('ENEMIES tuning', () => {
  it('takes several hits to crash, and guns reach above the tallest roofs', () => {
    expect(Math.ceil(LANDING.maxHealth / ENEMIES.flakDamage)).toBeGreaterThanOrEqual(5);
    expect(ENEMIES.aaReloadMin).toBeLessThanOrEqual(ENEMIES.aaReloadMax);
    expect(ENEMIES.flakSpeed * ENEMIES.flakLife).toBeGreaterThanOrEqual(ENEMIES.aaRange);
  });
});
