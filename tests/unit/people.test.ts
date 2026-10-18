import { describe, expect, it } from 'vitest';
import { PEOPLE } from '../../src/config/tuning';
import { hovering } from '../../src/logic/flight';
import type { Heli, HeliMode } from '../../src/logic/landing';
import {
  blockers,
  inHeli,
  sameRoof,
  tally,
  updatePeople,
  visible,
  waitingOn,
  type Person,
  type PeopleEvent,
} from '../../src/logic/people';
import type { Roof } from '../../src/logic/world';

const t = {
  runSpeed: 40,
  walkSpeed: 30,
  boardReach: 4,
  boardSeconds: 0.3,
  capacity: 2,
  unloadGap: 0.6,
  height: 26,
  halfWidth: 6,
};
const roof: Roof = { left: 980, right: 1124, y: 142, base: false };
const other: Roof = { left: 330, right: 442, y: 126, base: false };
const base: Roof = { left: 16, right: 176, y: 206, base: true };
const HUT = 46;

function heli(mode: HeliMode, x: number, on: Roof | null): Heli {
  return {
    mode,
    flight: hovering(x, (on?.y ?? 100) - 24),
    facing: 1,
    health: 100,
    on,
    crashedFor: 0,
  };
}

/** Runs the people rules at 60 fps for `seconds` with a fixed helicopter. */
function run(
  people: Person[],
  h: Heli,
  seconds: number,
): { people: Person[]; events: PeopleEvent[] } {
  let state = people;
  const events: PeopleEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    const r = updatePeople(state, h, 1 / 60, HUT, t);
    state = r.people;
    events.push(...r.events);
  }
  return { people: state, events };
}

const one = (): Person[] => [waitingOn(0, 1108, roof)];

describe('waiting', () => {
  it('waits while the helicopter is flying or landed somewhere else', () => {
    for (const h of [
      heli('flying', 1050, null),
      heli('landed', 380, other),
      heli('landed', 96, base),
    ]) {
      const { people, events } = run(one(), h, 2);
      expect(people[0]).toMatchObject({ mode: 'waiting', x: 1108 });
      expect(events).toEqual([]);
    }
  });

  it('blocks landing where they stand', () => {
    expect(blockers(one(), t)).toEqual([{ x: 1108, halfWidth: 6, top: 142 - 26 }]);
  });
});

describe('boarding', () => {
  it('runs to the landed helicopter, climbs in and rides along', () => {
    const landed = heli('landed', 1040, roof);
    const half = run(one(), landed, 0.5).people;
    expect(half[0]?.mode).toBe('running');
    expect(half[0]?.x).toBeCloseTo(1108 - 20);
    expect(half[0]?.facing).toBe(-1);
    expect(blockers(half, t)).toHaveLength(1);

    const { people, events } = run(one(), landed, 3);
    expect(people[0]?.mode).toBe('aboard');
    expect(events).toEqual([{ kind: 'boarded', id: 0 }]);
    expect(blockers(people, t)).toEqual([]);

    const flying = heli('flying', 600, null);
    const riding = run(people, flying, 0.1).people[0];
    expect(riding).toMatchObject({ mode: 'aboard', x: 600 });
  });

  it('stops and waits if the helicopter takes off first', () => {
    const halfway = run(one(), heli('landed', 1040, roof), 0.5).people;
    const after = run(halfway, heli('flying', 1040, null), 1).people[0];
    expect(after?.mode).toBe('waiting');
    expect(after?.x).toBeCloseTo(1088);
  });

  it('goes back to waiting if the helicopter leaves while they climb in', () => {
    const boarding = run(one(), heli('landed', 1100, roof), 0.25).people;
    expect(boarding[0]?.mode).toBe('boarding');
    expect(run(boarding, heli('flying', 1100, null), 0.1).people[0]?.mode).toBe('waiting');
  });

  it('never takes more people than the helicopter holds', () => {
    const crowd = [1100, 1104, 1108].map((x, id) => waitingOn(id, x, roof));
    const { people } = run(crowd, heli('landed', 1040, roof), 5);
    expect(people.filter((p) => p.mode === 'aboard')).toHaveLength(2);
    expect(people.filter((p) => p.mode === 'waiting')).toHaveLength(1);
    expect(tally(people).aboard).toBe(2);
  });
});

describe('unloading at base', () => {
  const aboard = (n: number): Person[] =>
    run(
      Array.from({ length: n }, (_, id) => waitingOn(id, 1050 + id * 4, roof)),
      heli('landed', 1040, roof),
      5,
    ).people;

  it('gets out one at a time, walks into the hut and is saved', () => {
    const riders = aboard(2);
    expect(riders.every((p) => p.mode === 'aboard')).toBe(true);
    const atBase = heli('landed', 96, base);

    const first = run(riders, atBase, 0.1).people;
    expect(first.map((p) => p.mode)).toEqual(['unloading', 'unloading']);
    expect(first.map(visible)).toEqual([true, false]); // second waits inside
    expect(first.map(inHeli)).toEqual([false, true]);
    expect(first[0]?.facing).toBe(-1);

    const { people, events } = run(riders, atBase, 6);
    expect(people.map((p) => p.mode)).toEqual(['saved', 'saved']);
    expect(events).toEqual([
      { kind: 'saved', id: 0 },
      { kind: 'saved', id: 1 },
    ]);
    expect(tally(people)).toEqual({ total: 2, saved: 2, lost: 0, aboard: 0 });
  });

  it('keeps the rest aboard if the helicopter leaves base mid-unload', () => {
    const started = run(aboard(2), heli('landed', 96, base), 0.1).people;
    const left = run(started, heli('flying', 96, null), 0.1).people;
    expect(left[0]?.mode).toBe('unloading'); // already out, still walks to the hut
    expect(left[1]?.mode).toBe('aboard');
  });
});

describe('crash', () => {
  it('loses everyone aboard, with nobody left on the map', () => {
    const riders = run([waitingOn(0, 1050, roof)], heli('landed', 1040, roof), 5).people;
    const { people, events } = run(riders, heli('crashed', 600, null), 0.1);
    expect(people[0]?.mode).toBe('lost');
    expect(visible(people[0] as Person)).toBe(false);
    expect(events).toEqual([{ kind: 'lost', id: 0 }]);
  });

  it('leaves people on roofs waiting', () => {
    expect(run(one(), heli('crashed', 600, null), 1).people[0]?.mode).toBe('waiting');
  });
});

describe('helpers', () => {
  it('compares roofs by position', () => {
    expect(sameRoof(roof, { ...roof })).toBe(true);
    expect(sameRoof(roof, other)).toBe(false);
    expect(sameRoof(roof, null)).toBe(false);
  });
});

describe('PEOPLE tuning', () => {
  it('carries 8 to 12 people (scope)', () => {
    expect(PEOPLE.capacity).toBeGreaterThanOrEqual(8);
    expect(PEOPLE.capacity).toBeLessThanOrEqual(12);
  });
});
