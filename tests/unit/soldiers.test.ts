import { describe, expect, it } from 'vitest';
import { PEOPLE, SOLDIERS } from '../../src/config/tuning';
import { createRng } from '../../src/logic/rng';
import {
  exposed,
  personBox,
  shootPerson,
  visible,
  waitingOn,
  type Person,
} from '../../src/logic/people';
import {
  hitSoldier,
  newSquad,
  soldierBox,
  updateSquad,
  type Exposed,
  type SoldierEvent,
  type Squad,
} from '../../src/logic/soldiers';
import type { Arena } from '../../src/logic/weapons';

const t = {
  walkSpeed: 20,
  range: 180,
  reloadMin: 1.5,
  reloadMax: 2.5,
  firstShot: 1,
  shootPose: 0.3,
  muzzleX: 22,
  muzzleY: 26,
  shotSpeed: 170,
  shotLife: 1.6,
  maxShots: 3,
  halfWidth: 9,
  height: 34,
  personHalfWidth: 6,
  personHeight: 26,
  downSeconds: 0.6,
  hitStep: 4,
};
// Roof A 300..400 at y 150 (people), roof B 500..600 at y 190; street at 254.
const arena: Arena = {
  buildings: [
    { left: 300, right: 400, y: 150, base: false },
    { left: 500, right: 600, y: 190, base: false },
  ],
  groundY: 254,
  width: 1000,
};
const street = { x: 450, y: 254, minX: 430, maxX: 470 };
const runner = (x: number, roof = 0, vx = 0): Exposed => ({ id: 7, x, y: 150, roof, vx });

function run(q: Squad, people: Exposed[], seconds: number, seed = 1): SoldierEvent[] {
  const rng = createRng(seed);
  const events: SoldierEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...updateSquad(q, people, 1 / 60, arena, t, rng));
  }
  return events;
}

describe('patrol', () => {
  it('walks back and forth inside its limits when nobody is out', () => {
    const q = newSquad([street], t);
    const xs: number[] = [];
    for (let i = 0; i < 60 * 6; i++) {
      updateSquad(q, [], 1 / 60, arena, t, createRng(1));
      xs.push(q.soldiers[0]?.x ?? 0);
    }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(430);
    expect(Math.max(...xs)).toBeLessThanOrEqual(470);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(30);
    expect(q.soldiers[0]?.mode).toBe('patrol');
  });
});

describe('shooting people', () => {
  it('stops, faces and fires at a person running within range, after the first-shot delay', () => {
    const q = newSquad([street], t);
    expect(run(q, [runner(390)], 0.9)).toEqual([]);
    expect(q.soldiers[0]).toMatchObject({ mode: 'shoot', facing: -1 });
    const events = run(q, [runner(390)], 0.2);
    expect(events).toEqual([{ kind: 'soldier-fired', soldier: 0 }]);
  });

  it('hits the person: the shot passes the edge of the roof they stand on', () => {
    const q = newSquad([street], t);
    const events = run(q, [runner(390)], 3);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'person-hit', id: 7 }));
  });

  it('leads a running target: hits someone running across the roof', () => {
    // A person running left at 40 px/s across roof A, from 395.
    const q = newSquad([street], t);
    const rng = createRng(2);
    let x = 395;
    let hit = false;
    for (let i = 0; i < 60 * 3 && !hit && x > 305; i++) {
      x -= 40 / 60;
      const ev = updateSquad(q, [runner(x, 0, -40)], 1 / 60, arena, t, rng);
      hit = ev.some((e) => e.kind === 'person-hit');
    }
    expect(hit).toBe(true);
  });

  it('other buildings block the shot', () => {
    // A soldier left of roof A, a person on roof B: roof A is in the way.
    // The person is 248 px away, so this soldier gets a longer range.
    const far = { ...t, range: 300 };
    const q = newSquad([{ x: 270, y: 254, minX: 260, maxX: 280 }], far);
    const rng = createRng(1);
    const events: SoldierEvent[] = [];
    for (let i = 0; i < 60 * 4; i++) {
      events.push(
        ...updateSquad(q, [{ id: 3, x: 510, y: 190, roof: 1, vx: 0 }], 1 / 60, arena, far, rng),
      );
    }
    expect(events).toContainEqual(expect.objectContaining({ kind: 'soldier-fired' }));
    expect(events.some((e) => e.kind === 'person-hit')).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'shot-stopped' }));
  });

  it('ignores people out of range, and fires again only after a seeded reload', () => {
    expect(run(newSquad([street], t), [runner(250, 0)], 3)).toEqual([]); // about 225 px away: out of range
    const fired = (seed: number): number[] => {
      const q = newSquad([street], { ...t, shotLife: 0.01 });
      const rng = createRng(seed);
      const at: number[] = [];
      for (let i = 0; i < 60 * 8; i++) {
        if (updateSquad(q, [runner(390)], 1 / 60, arena, { ...t, shotLife: 0.01 }, rng).length)
          at.push(i);
      }
      return at;
    };
    const a = fired(5);
    expect(a).toEqual(fired(5));
    for (let i = 1; i < a.length; i++) {
      const gap = ((a[i] ?? 0) - (a[i - 1] ?? 0)) / 60;
      expect(gap).toBeGreaterThanOrEqual(1.5 - 1 / 60);
      expect(gap).toBeLessThanOrEqual(2.5 + 1 / 60);
    }
  });

  it('keeps a fixed shot pool', () => {
    const q = newSquad([street, { ...street, x: 440 }, { ...street, x: 460 }], {
      ...t,
      maxShots: 2,
    });
    const before = [...q.shots];
    run(q, [runner(390)], 5);
    expect(q.shots).toHaveLength(2);
    expect(q.shots.every((s, i) => s === before[i])).toBe(true);
  });
});

describe('soldiers going down', () => {
  it('one hit takes a soldier down; it falls, then is gone, and stops shooting', () => {
    const q = newSquad([street], t);
    expect(hitSoldier(q, 0)).toEqual({ kind: 'soldier-down', soldier: 0, x: 450, y: 254 });
    expect(hitSoldier(q, 0)).toBeNull();
    const s = q.soldiers[0];
    if (!s) throw new Error('no soldier');
    expect(soldierBox(s, t)).toBeNull();
    expect(run(q, [runner(390)], 0.5)).toEqual([]);
    expect(s.mode).toBe('down');
    run(q, [], 0.2);
    expect(s.mode).toBe('gone');
  });

  it('has a hit box around the figure, standing on its surface', () => {
    const s = newSquad([street], t).soldiers[0];
    if (!s) throw new Error('no soldier');
    expect(soldierBox(s, t)).toEqual({ left: 441, right: 459, top: 220, bottom: 254 });
  });
});

describe('people under fire', () => {
  const roof = { left: 300, right: 400, y: 150, base: false };
  const running = (id: number): Person => ({ ...waitingOn(id, 350, roof), mode: 'running' });

  it('only people running or climbing in are exposed', () => {
    expect(exposed(running(1))).toBe(true);
    expect(exposed({ ...running(1), mode: 'boarding' })).toBe(true);
    expect(exposed(waitingOn(1, 350, roof))).toBe(false);
    expect(exposed({ ...running(1), mode: 'aboard' })).toBe(false);
  });

  it('a hit person is lost; anyone not exposed is left alone', () => {
    const { people, event } = shootPerson([running(1), waitingOn(2, 360, roof)], 1);
    expect(people[0]?.mode).toBe('lost');
    expect(event).toEqual({ kind: 'lost', id: 1 });
    expect(shootPerson(people, 2)).toEqual({ people, event: null });
  });
});

describe('friendly fire (owner, 2026-10-19)', () => {
  const roof = { left: 300, right: 400, y: 150, base: false };
  it('our own fire can hit anyone standing in the open, not people aboard', () => {
    const waiting = waitingOn(1, 350, roof);
    const { people, event } = shootPerson([waiting], 1, visible);
    expect(people[0]?.mode).toBe('lost');
    expect(event).toEqual({ kind: 'lost', id: 1 });
    const aboard: Person = { ...waiting, mode: 'aboard', roof: null };
    expect(shootPerson([aboard], 1, visible).event).toBeNull();
  });

  it('a person standing in the open has a hit box; nobody else does', () => {
    expect(personBox(waitingOn(1, 350, roof), { halfWidth: 6, height: 26 })).toEqual({
      left: 344,
      right: 356,
      top: 124,
      bottom: 150,
    });
    const aboard: Person = { ...waitingOn(1, 350, roof), mode: 'aboard' };
    expect(personBox(aboard, { halfWidth: 6, height: 26 })).toBeNull();
  });
});

describe('SOLDIERS tuning', () => {
  it('matches the people sizes and reaches a neighbouring roof', () => {
    expect(SOLDIERS.personHalfWidth).toBe(PEOPLE.halfWidth);
    expect(SOLDIERS.personHeight).toBe(PEOPLE.height);
    expect(SOLDIERS.shotSpeed * SOLDIERS.shotLife).toBeGreaterThanOrEqual(SOLDIERS.range);
    expect(SOLDIERS.reloadMin).toBeLessThanOrEqual(SOLDIERS.reloadMax);
  });
});
