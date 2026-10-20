import { describe, expect, it } from 'vitest';
import { GUNSHIPS, LANDING } from '../../src/config/tuning';
import { hovering } from '../../src/logic/flight';
import type { Heli, HeliMode } from '../../src/logic/landing';
import { createRng } from '../../src/logic/rng';
import {
  gunshipBox,
  gunshipGun,
  hitGunship,
  newFleet,
  updateGunships,
  type Fleet,
  type Gunship,
  type GunshipEvent,
} from '../../src/logic/gunships';
import type { Arena } from '../../src/logic/weapons';

const t = { ...GUNSHIPS, firstShot: 1, reloadMin: 3, reloadMax: 4 };
const arena: Arena = { buildings: [], groundY: 254, width: 3000 };
const post = { x: 1000, y: 60, minX: 900, maxX: 1100 };
const heli = (x: number, y: number, mode: HeliMode = 'flying'): Heli => ({
  mode,
  flight: hovering(x, y),
  facing: 1,
  health: 100,
  on: null,
  crashedFor: 0,
});
const away = heli(100, 60);

function first(f: Fleet): Gunship {
  const g = f.ships[0];
  if (!g) throw new Error('no gunship');
  return g;
}

function run(f: Fleet, h: Heli, seconds: number, seed = 1): GunshipEvent[] {
  const rng = createRng(seed);
  const events: GunshipEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...updateGunships(f, h, 1 / 60, arena, t, rng));
  }
  return events;
}

const fired = (es: GunshipEvent[]): GunshipEvent[] => es.filter((e) => e.kind === 'gunship-fired');

describe('gunships', () => {
  it('hover back and forth over their stretch, bobbing gently', () => {
    const f = newFleet([post], t);
    const g = first(f);
    let lo = Infinity;
    let hi = -Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (let i = 0; i < 40; i++) {
      run(f, away, 0.5);
      expect(g.x).toBeGreaterThanOrEqual(post.minX);
      expect(g.x).toBeLessThanOrEqual(post.maxX);
      lo = Math.min(lo, g.y);
      hi = Math.max(hi, g.y);
      left = Math.min(left, g.x);
      right = Math.max(right, g.x);
    }
    // It reached both ends of its stretch, and bobbed but no further than `bob`.
    expect(left).toBeLessThan(post.minX + 15);
    expect(right).toBeGreaterThan(post.maxX - 15);
    expect(hi - lo).toBeGreaterThan(t.bob);
    expect(lo).toBeGreaterThanOrEqual(post.y - t.bob - 1e-9);
    expect(hi).toBeLessThanOrEqual(post.y + t.bob + 1e-9);
  });

  it('fire an aimed burst at a helicopter in range, then reload', () => {
    const f = newFleet([post], t);
    const h = heli(820, 120); // left of it (it starts facing left), below
    expect(fired(run(f, h, 0.95))).toEqual([]);
    const burst = fired(run(f, h, 1));
    expect(burst).toHaveLength(t.burst);
    // Aimed: shots head left and down toward the helicopter.
    const live = f.shots.filter((s) => s.alive);
    expect(live.length).toBeGreaterThan(0);
    for (const s of live) {
      expect(s.vx).toBeLessThan(0);
      expect(s.vy).toBeGreaterThan(0);
      expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(t.shotSpeed);
    }
    // No more until it has reloaded (at least 3 s).
    expect(fired(run(f, h, 2.5))).toEqual([]);
    expect(fired(run(f, h, 2)).length).toBeGreaterThan(0);
  });

  it('stop while engaged, and turn to face a helicopter behind them first', () => {
    const f = newFleet([post], t);
    const g = first(f);
    const h = heli(1150, 60); // to its right; it faces left
    run(f, h, 0.1);
    const x = g.x;
    expect(g.engaged).toBe(true);
    expect(g.facing).toBe(1);
    run(f, h, 1);
    expect(g.x).toBe(x);
    expect(gunshipGun(g, t).x).toBe(g.x + t.gunX);
  });

  it('hit the helicopter for shot damage', () => {
    const f = newFleet([post], t);
    const events = run(f, heli(850, 90), 4);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'heli-hit', damage: t.shotDamage }),
    );
  });

  it('ignore a helicopter out of range, and a wreck', () => {
    expect(fired(run(newFleet([post], t), heli(600, 60), 10))).toEqual([]);
    expect(fired(run(newFleet([post], t), heli(900, 60, 'crashed'), 10))).toEqual([]);
  });

  it('keep the shot pool fixed', () => {
    const f = newFleet([post, { ...post, x: 1050 }], t);
    run(f, heli(900, 80), 30);
    expect(f.shots).toHaveLength(t.maxShots);
  });

  it('take six bullets to bring down', () => {
    const f = newFleet([post], t);
    const g = first(f);
    expect(gunshipBox(g, t)).toEqual({
      left: g.x - t.halfWidth,
      right: g.x + t.halfWidth,
      top: g.y - t.halfHeight,
      bottom: g.y + t.halfHeight,
    });
    for (let i = 1; i < t.hp; i++) expect(hitGunship(f, 0, 1)).toBeNull();
    expect(hitGunship(f, 0, 1)).toEqual({ kind: 'gunship-down', ship: 0, x: g.x, y: g.y });
    expect(gunshipBox(g, t)).toBeNull();
    expect(hitGunship(f, 0, 1)).toBeNull();
    expect(hitGunship(f, 4, 1)).toBeNull();
    expect(run(f, heli(850, 90), 5)).toEqual([]);
  });
});

describe('gunship tuning', () => {
  it('a burst takes at most a quarter of the health', () => {
    expect(GUNSHIPS.burst * GUNSHIPS.shotDamage).toBeLessThanOrEqual(LANDING.maxHealth / 4);
  });

  it('the hit box fits inside the drawn ship, and shots reach the range', () => {
    expect(GUNSHIPS.halfWidth).toBeLessThanOrEqual(GUNSHIPS.spriteHalfWidth);
    expect(GUNSHIPS.halfHeight).toBeLessThanOrEqual(GUNSHIPS.spriteHalfHeight);
    expect(GUNSHIPS.gunX).toBeLessThan(GUNSHIPS.spriteHalfWidth);
    expect(GUNSHIPS.shotSpeed * GUNSHIPS.shotLife).toBeGreaterThan(GUNSHIPS.range);
    expect(GUNSHIPS.maxShots).toBeGreaterThanOrEqual(GUNSHIPS.burst);
  });
});
