import { describe, expect, it } from 'vitest';
import { JETS, LANDING } from '../../src/config/tuning';
import { hovering } from '../../src/logic/flight';
import type { Heli, HeliMode } from '../../src/logic/landing';
import { createRng } from '../../src/logic/rng';
import {
  hitJet,
  jetBox,
  newSky,
  passHeight,
  updateJets,
  type JetEvent,
  type Raid,
  type Sky,
  type View,
} from '../../src/logic/jets';
import type { Arena } from '../../src/logic/weapons';

const t = { ...JETS, maxJets: 2, maxShots: 4 };
const arena: Arena = { buildings: [], groundY: 254, width: 3000 };
const view: View = { left: 1000, right: 1480, bottomY: 66 };
const raid: Raid = { first: 10, every: 30 };
const heli = (x: number, y: number, mode: HeliMode = 'flying'): Heli => ({
  mode,
  flight: hovering(x, y),
  facing: 1,
  health: 100,
  on: null,
  crashedFor: 0,
});

function run(
  s: Sky,
  h: Heli,
  seconds: number,
  r: Raid | undefined = raid,
  seed = 1,
  v: View = view,
): JetEvent[] {
  const rng = createRng(seed);
  const events: JetEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...updateJets(s, h, 1 / 60, arena, v, r, t, rng));
  }
  return events;
}

const kinds = (es: JetEvent[]): string[] => es.map((e) => e.kind);

describe('jet passes', () => {
  it('never come in a mission without a raid', () => {
    const s = newSky(undefined, t);
    expect(run(s, heli(1200, 60), 120, undefined)).toEqual([]);
    expect(s.jets.every((j) => !j.alive)).toBe(true);
  });

  it('are warned of before they come on screen, at the side and height they fly', () => {
    const s = newSky(raid, t);
    const quiet = run(s, heli(1200, 60), raid.first - t.warnSeconds - 0.1);
    expect(quiet).toEqual([]);
    const warned = run(s, heli(1200, 60), 0.2);
    expect(kinds(warned)).toEqual(['jet-warning']);
    const w = s.warning;
    expect(w).not.toBeNull();
    // Still warning, not here yet.
    expect(kinds(run(s, heli(1200, 60), t.warnSeconds - 0.3))).toEqual([]);
    const came = run(s, heli(1200, 60), 0.3);
    expect(kinds(came)).toContain('jet-in');
    const j = s.jets.find((x) => x.alive);
    expect(j?.y).toBe(w?.y);
    // From the warned side, flying the other way, starting off screen.
    expect(j?.facing).toBe(w?.side === -1 ? 1 : -1);
    if (w?.side === -1) expect(j?.x).toBeLessThan(view.left);
    else expect(j?.x).toBeGreaterThan(view.right);
    expect(s.warning).toBeNull();
  });

  it('cross the screen fast and are gone past the far edge', () => {
    const s = newSky({ first: t.warnSeconds, every: 30 }, t);
    run(s, heli(1200, 200), t.warnSeconds + 0.05);
    const j = s.jets.find((x) => x.alive);
    expect(j).toBeDefined();
    const crossing = (view.right - view.left + 2 * t.offscreen) / t.speed;
    run(s, heli(1200, 200), crossing + 0.2);
    expect(s.jets.every((x) => !x.alive)).toBe(true);
  });

  it('fire a short level burst at a helicopter ahead and level with them', () => {
    // Several seeds: passes come from either side, at slightly different heights.
    for (const seed of [1, 2, 3, 4]) {
      const r = { first: t.warnSeconds, every: 30 };
      const s = newSky(r, t);
      const events = run(s, heli(1240, 50), 5, r, seed);
      const fired = events.filter((e) => e.kind === 'jet-fired');
      expect(fired).toHaveLength(t.burst);
      expect(events.some((e) => e.kind === 'heli-hit')).toBe(true);
      // Shots are level: they keep their height.
      expect(s.shots.every((x) => x.vy === 0)).toBe(true);
    }
  });

  it('cannot reach a helicopter well below the rooftops, or a wreck', () => {
    const low = newSky({ first: 2, every: 30 }, t);
    expect(kinds(run(low, heli(1240, 200), 8)).filter((k) => k === 'jet-fired')).toEqual([]);
    const wreck = newSky({ first: 2, every: 30 }, t);
    expect(
      kinds(run(wreck, heli(1240, 50, 'crashed'), 8)).filter((k) => k === 'jet-fired'),
    ).toEqual([]);
  });

  it('a burst of 3 takes at most a quarter of the health', () => {
    expect(t.burst * t.shotDamage).toBeLessThanOrEqual(LANDING.maxHealth / 4);
  });

  it('come again about every `every` seconds', () => {
    const s = newSky({ first: 10, every: 30 }, t);
    const events = run(s, heli(1240, 200), 10 + 30 * 3 + 10, { first: 10, every: 30 });
    const ins = events.filter((e) => e.kind === 'jet-in').length;
    expect(ins).toBeGreaterThanOrEqual(3);
    expect(ins).toBeLessThanOrEqual(5);
  });

  it('keep their pools fixed', () => {
    const s = newSky({ first: 15, every: 15 }, t);
    run(s, heli(1240, 50), 200, { first: 15, every: 15 });
    expect(s.jets).toHaveLength(t.maxJets);
    expect(s.shots).toHaveLength(t.maxShots);
  });
});

describe('pass height', () => {
  it('follows the helicopter but stays between the top and the rooftop clearance', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) {
      const y = passHeight(40, view, t, rng);
      expect(y).toBeGreaterThanOrEqual(t.topY);
      expect(y).toBeLessThanOrEqual(view.bottomY);
      expect(Math.abs(y - 40)).toBeLessThanOrEqual(t.heightJitter);
    }
    expect(passHeight(200, view, t, rng)).toBe(view.bottomY);
    expect(passHeight(0, view, t, rng)).toBe(t.topY);
  });
});

describe('shooting jets down', () => {
  it('takes two hits, and a downed jet stops flying', () => {
    const s = newSky({ first: t.warnSeconds, every: 30 }, t);
    run(s, heli(1240, 200), t.warnSeconds + 0.05);
    const i = s.jets.findIndex((j) => j.alive);
    const j = s.jets[i];
    if (!j) throw new Error('no jet');
    expect(jetBox(j, t)).toEqual({
      left: j.x - t.halfWidth,
      right: j.x + t.halfWidth,
      top: j.y - t.halfHeight,
      bottom: j.y + t.halfHeight,
    });
    expect(hitJet(s, i, 1)).toBeNull();
    expect(hitJet(s, i, 1)).toEqual({ kind: 'jet-down', jet: i, x: j.x, y: j.y });
    expect(jetBox(j, t)).toBeNull();
    expect(hitJet(s, i, 1)).toBeNull();
    expect(hitJet(s, 9, 1)).toBeNull();
  });
});
