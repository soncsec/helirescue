import { describe, expect, it } from 'vitest';
import { WEAPONS } from '../../src/config/tuning';
import { hovering } from '../../src/logic/flight';
import type { Heli, HeliMode } from '../../src/logic/landing';
import {
  armed,
  flying,
  gunAim,
  newWeapons,
  updateWeapons,
  type Arena,
  type WeaponEvent,
  type Weapons,
} from '../../src/logic/weapons';

const t = {
  bulletSpeed: 300,
  bulletLife: 1,
  fireEvery: 0.2,
  noseX: 40,
  noseY: 6,
  maxBullets: 3,
  bombGravity: 400,
  bombEvery: 0.5,
  maxBombs: 2,
  dropY: 20,
  hitStep: 4,
};
// A building from x 500 to 600, roof at y 150; the street at y 254; 1000 wide.
const arena: Arena = {
  buildings: [{ left: 500, right: 600, y: 150, base: false }],
  groundY: 254,
  width: 1000,
};
const heli = (
  x: number,
  y: number,
  facing: 1 | -1 = 1,
  mode: HeliMode = 'flying',
  vx = 0,
): Heli => ({
  mode,
  flight: { ...hovering(x, y), vx },
  facing,
  health: 100,
  on: null,
  crashedFor: 0,
});
const hold = { fire: true, bomb: false };
const idle = { fire: false, bomb: false };
const bomb = { fire: false, bomb: true };

/** Runs at 60 fps for `seconds`, collecting events. */
function run(w: Weapons, h: Heli, input: typeof hold, seconds: number, a = arena): WeaponEvent[] {
  const events: WeaponEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...updateWeapons(w, h, input, 1 / 60, a, t));
  }
  return events;
}

describe('the gun', () => {
  it('fires from the nose the way the helicopter faces', () => {
    const w = newWeapons(t);
    expect(updateWeapons(w, heli(100, 50), hold, 1 / 60, arena, t)).toEqual([{ kind: 'fired' }]);
    expect(w.shots.find((s) => s.alive)).toMatchObject({ kind: 'bullet', x: 140, y: 56, vx: 300 });

    const left = newWeapons(t);
    updateWeapons(left, heli(300, 50, -1), hold, 1 / 60, arena, t);
    expect(left.shots.find((s) => s.alive)).toMatchObject({ x: 260, vx: -300 });
  });

  it('adds the helicopter speed, so flying backwards still fires forward', () => {
    const w = newWeapons(t);
    updateWeapons(w, heli(300, 50, 1, 'flying', -100), hold, 1 / 60, arena, t);
    expect(w.shots.find((s) => s.alive)?.vx).toBe(200);
  });

  it('fires along the body: leaning into forward flight aims down ahead (owner, 2026-10-20)', () => {
    const tilted = (facing: 1 | -1, tilt: number): Heli => {
      const h = heli(300, 50, facing);
      return { ...h, flight: { ...h.flight, tilt } };
    };
    const rad = (12 * Math.PI) / 180;
    for (const facing of [1, -1] as const) {
      // Flying forward leans the nose down: tilt +12 facing right, -12 facing left.
      const w = newWeapons(t);
      updateWeapons(w, tilted(facing, 12 * facing), hold, 1 / 60, arena, t);
      const s = w.shots.find((x) => x.alive);
      expect(s?.vx).toBeCloseTo(facing * 300 * Math.cos(rad));
      expect(s?.vy).toBeCloseTo(300 * Math.sin(rad)); // downward
      // From the nose as drawn: ahead of and below the level nose.
      expect(s?.y).toBeCloseTo(50 + 40 * Math.sin(rad) + 6 * Math.cos(rad));
      expect(((s?.x ?? 0) - 300) * facing).toBeCloseTo(40 * Math.cos(rad) - 6 * Math.sin(rad));
    }
    // Leaning back (slowing down) aims up a little.
    expect(gunAim(tilted(1, -6), t).dy).toBeLessThan(0);
    // Level: straight ahead, a unit vector.
    const level = gunAim(tilted(-1, 0), t);
    expect(level).toMatchObject({ x: 260, y: 56, dx: -1 });
    expect(Math.hypot(level.dx, level.dy)).toBeCloseTo(1);
  });

  it('repeats every fireEvery while held, and not at all when released', () => {
    const w = newWeapons(t);
    const fired = run(w, heli(100, 50), hold, 0.5).filter((e) => e.kind === 'fired');
    expect(fired).toHaveLength(3); // at 0, 0.2 and 0.4 s
    expect(run(newWeapons(t), heli(100, 50), idle, 0.5)).toEqual([]);
  });

  it('does not fire when landed or crashed', () => {
    for (const mode of ['landed', 'crashed'] as const) {
      expect(run(newWeapons(t), heli(100, 50, 1, mode), hold, 0.5)).toEqual([]);
    }
    expect(armed(heli(1, 1, 1, 'landing'))).toBe(true);
  });

  it('stops a bullet at a wall with an impact, and runs out after its life', () => {
    const w = newWeapons(t);
    updateWeapons(w, heli(400, 200), hold, 1 / 60, arena, t);
    const events = run(w, heli(400, 200), idle, 0.5);
    const impact = events.find((e) => e.kind === 'impact');
    expect(impact).toMatchObject({ kind: 'impact', y: 206 });
    expect(impact && 'x' in impact ? impact.x : 0).toBeGreaterThanOrEqual(500);
    expect(impact && 'x' in impact ? impact.x : 999).toBeLessThan(504);
    expect(flying(w, 'bullet')).toBe(0);

    const sky = newWeapons(t);
    updateWeapons(sky, heli(100, 50), hold, 1 / 60, arena, t);
    expect(run(sky, heli(100, 50), idle, 0.9)).toEqual([]);
    expect(flying(sky, 'bullet')).toBe(1); // over the roofs, still flying
    run(sky, heli(100, 50), idle, 0.2);
    expect(flying(sky, 'bullet')).toBe(0); // life over
  });

  it('never tunnels through a wall in a long frame', () => {
    const w = newWeapons(t);
    updateWeapons(w, heli(450, 200), hold, 1 / 60, arena, t);
    const events = updateWeapons(w, heli(450, 200), idle, 0.5, arena, t);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'impact' }));
  });
});

describe('bombs', () => {
  it('drop from between the skids with the helicopter speed, one per press', () => {
    const w = newWeapons(t);
    expect(updateWeapons(w, heli(300, 50, 1, 'flying', 80), bomb, 1 / 60, arena, t)).toEqual([
      { kind: 'dropped' },
    ]);
    expect(w.shots.find((s) => s.alive)).toMatchObject({ kind: 'bomb', x: 300, y: 70, vx: 80 });
  });

  it('explode on the roof they land on', () => {
    const w = newWeapons(t);
    updateWeapons(w, heli(550, 50), bomb, 1 / 60, arena, t);
    const blast = run(w, heli(550, 50), idle, 2).find((e) => e.kind === 'blast');
    expect(blast).toEqual({ kind: 'blast', x: 550, y: 150 });
    expect(flying(w, 'bomb')).toBe(0);
  });

  it('explode on the street between buildings', () => {
    const w = newWeapons(t);
    updateWeapons(w, heli(300, 50), bomb, 1 / 60, arena, t);
    expect(run(w, heli(300, 50), idle, 2).find((e) => e.kind === 'blast')).toEqual({
      kind: 'blast',
      x: 300,
      y: 254,
    });
  });

  it('wait bombEvery between drops and never drop when landed', () => {
    const w = newWeapons(t);
    const drops = run(w, heli(300, 20), bomb, 0.4).filter((e) => e.kind === 'dropped');
    expect(drops).toHaveLength(1);
    expect(run(newWeapons(t), heli(300, 20, 1, 'landed'), bomb, 1)).toEqual([]);
  });
});

describe('the pool', () => {
  it('never grows: with every slot flying, Fire waits for a free one', () => {
    const w = newWeapons(t);
    const size = w.shots.length;
    // Fire as fast as possible with a very short cooldown.
    const quick = { ...t, fireEvery: 0 };
    for (let i = 0; i < 10; i++) updateWeapons(w, heli(100, 50), hold, 1 / 60, arena, quick);
    expect(flying(w, 'bullet')).toBe(t.maxBullets);
    expect(w.shots).toHaveLength(size);
  });

  it('reuses the same shot objects', () => {
    const w = newWeapons(t);
    const before = [...w.shots];
    run(w, heli(100, 50), hold, 3);
    expect(w.shots.every((s, i) => s === before[i])).toBe(true);
  });
});

describe('WEAPONS tuning', () => {
  it('reaches at least a screen and fires at a steady rate', () => {
    expect(WEAPONS.bulletSpeed * WEAPONS.bulletLife).toBeGreaterThanOrEqual(480);
    expect(WEAPONS.fireEvery).toBeGreaterThan(0);
    // Enough bullets for a full burst: life / fireEvery, plus one.
    expect(WEAPONS.maxBullets).toBeGreaterThanOrEqual(
      Math.ceil(WEAPONS.bulletLife / WEAPONS.fireEvery) + 1,
    );
    expect(WEAPONS.hitStep).toBeLessThan(8);
  });
});
