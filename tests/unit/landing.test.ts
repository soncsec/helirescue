import { describe, expect, it } from 'vitest';
import { FLIGHT, HELI_SHAPE, LANDING } from '../../src/config/tuning';
import type { FlightState } from '../../src/logic/flight';
import {
  bumpDamage,
  landingDamage,
  newHeli,
  span,
  updateHeli,
  type Heli,
  type HeliRules,
  type HeliWorld,
} from '../../src/logic/landing';
import type { Axis } from '../../src/logic/movement';
import type { Roof } from '../../src/logic/world';

const shape = {
  bottom: 24,
  skidBack: 19,
  skidFront: 37,
  bodyBack: 21,
  bodyFront: 38,
  bodyHeight: 24,
};
const landing = {
  maxHealth: 100,
  safeSpeed: 40,
  damagePerSpeed: 0.6,
  landingZone: 16,
  respawnSeconds: 2,
  flareZone: 40,
  flareSpeed: 30,
  safeSideSpeed: 30,
  sideDamagePerSpeed: 0.4,
  bumpSafeSpeed: 30,
  bumpDamagePerSpeed: 0.08,
};
const rules: HeliRules = { flight: FLIGHT, landing, shape };

const roof: Roof = { left: 200, right: 328, y: 150, base: false };
const street: Roof = { left: 0, right: 1000, y: 254, base: false };
const world: HeliWorld = {
  surfaces: [roof, street],
  buildings: [roof],
  groundY: 254,
  people: [],
  bounds: { minX: 54, maxX: 946, minY: 24, maxY: 254 - 24 + 8 },
  spawn: { x: 60, y: 100 },
};

const none: Axis = { x: 0, y: 0 };
const up: Axis = { x: 0, y: -1 };
const down: Axis = { x: 0, y: 1 };
const right: Axis = { x: 1, y: 0 };

/** A helicopter at (x, y) with a given velocity. */
function heliAt(x: number, y: number, vy = 0, vx = 0): Heli {
  const h = newHeli(x, y, landing);
  const flight: FlightState = { ...h.flight, vx, vy };
  return { ...h, flight };
}

/** Runs the rules at 60 fps until `until` is true or `seconds` pass; returns every event. */
function run(
  h: Heli,
  input: Axis,
  seconds: number,
  w: HeliWorld = world,
  until: (h: Heli) => boolean = () => false,
): { heli: Heli; events: string[] } {
  let heli = h;
  const events: string[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    const r = updateHeli(heli, input, 1 / 60, w, rules);
    heli = r.heli;
    if (r.event.kind !== 'none') events.push(r.event.kind);
    if (until(heli)) break;
  }
  return { heli, events };
}

describe('span', () => {
  it('flips with the facing direction', () => {
    expect(span(100, 1, 19, 37)).toEqual([81, 137]);
    expect(span(100, -1, 19, 37)).toEqual([63, 119]);
  });
});

describe('landingDamage', () => {
  it('is zero up to the safe speed, then grows with speed', () => {
    expect(landingDamage(0, landing)).toBe(0);
    expect(landingDamage(40, landing)).toBe(0);
    expect(landingDamage(41, landing)).toBe(1);
    expect(landingDamage(90, landing)).toBe(30);
  });
});

describe('safe landing', () => {
  it('sinks gently onto a roof and lands with no damage', () => {
    const start = heliAt(250, 100);
    const { heli, events } = run(start, none, 10, world, (h) => h.mode === 'landed');
    expect(heli.mode).toBe('landed');
    expect(heli.on).toEqual(roof);
    expect(heli.health).toBe(100);
    expect(heli.flight.y + shape.bottom).toBe(roof.y);
    expect(heli.flight).toMatchObject({ vx: 0, vy: 0, tilt: 0 });
    expect(events).toEqual(['landed']);
  });

  it('shows `landing` just above a landing spot', () => {
    const h = heliAt(250, roof.y - shape.bottom - 10, 10);
    expect(updateHeli(h, none, 1 / 60, world, rules).heli.mode).toBe('landing');
    const high = heliAt(250, 60, 10);
    expect(updateHeli(high, none, 1 / 60, world, rules).heli.mode).toBe('flying');
    const climbing = heliAt(250, roof.y - shape.bottom - 10, -20);
    expect(updateHeli(climbing, none, 1 / 60, world, rules).heli.mode).toBe('flying');
  });

  it('lands on the street too', () => {
    const { heli } = run(heliAt(600, 200), none, 10, world, (h) => h.mode === 'landed');
    expect(heli.on).toEqual(street);
  });

  it('stays put while landed, ignoring left, right and down', () => {
    const landed = run(heliAt(250, 100), none, 10, world, (h) => h.mode === 'landed').heli;
    for (const input of [none, down, right, { x: -1, y: 0 } as Axis]) {
      expect(updateHeli(landed, input, 1, world, rules)).toEqual({
        heli: landed,
        event: { kind: 'none' },
      });
    }
  });

  it('takes off with up', () => {
    const landed = run(heliAt(250, 100), none, 10, world, (h) => h.mode === 'landed').heli;
    const r = updateHeli(landed, up, 1 / 60, world, rules);
    expect(r.event).toEqual({ kind: 'took-off' });
    expect(r.heli.mode).toBe('flying');
    expect(r.heli.on).toBeNull();
    const later = run(r.heli, up, 0.5).heli;
    expect(later.flight.y).toBeLessThan(landed.flight.y - 10);
  });
});

describe('hard landing', () => {
  it('touching down still moving sideways costs health in proportion to that speed', () => {
    // 120 px/s sideways: (120 - 30) x 0.4 = 36.
    const sliding = heliAt(240, roof.y - shape.bottom - 0.2, 20, 120);
    const r = updateHeli(sliding, right, 1 / 60, world, rules);
    expect(r.event).toMatchObject({ kind: 'hard-landing' });
    expect(r.heli.mode).toBe('landed');
    expect(100 - r.heli.health).toBeGreaterThanOrEqual(34);
    expect(100 - r.heli.health).toBeLessThanOrEqual(37);
  });

  it('touching down slowly sideways is safe', () => {
    const r = updateHeli(
      heliAt(250, roof.y - shape.bottom - 0.2, 20, 25),
      none,
      1 / 60,
      world,
      rules,
    );
    expect(r.event.kind).toBe('landed');
    expect(r.heli.health).toBe(100);
  });

  it('holding Down lands gently: the flare slows the descent near the roof (owner, 2026-10-19)', () => {
    const { heli, events } = run(heliAt(250, 40), down, 5, world, (h) => h.mode === 'landed');
    expect(events).toEqual(['landed']);
    expect(heli.health).toBe(100);
  });

  it('dives fast high up, and flares only near a landing spot', () => {
    const high = run(heliAt(250, 30), down, 0.6).heli;
    expect(high.flight.vy).toBeGreaterThan(landing.flareSpeed);
    const near = updateHeli(
      heliAt(250, roof.y - shape.bottom - 20, 90),
      down,
      1 / 60,
      world,
      rules,
    );
    expect(near.heli.flight.vy).toBe(landing.flareSpeed);
  });

  it('crashes when health runs out, then respawns at base after a delay', () => {
    const weak = { ...heliAt(240, roof.y - shape.bottom - 0.2, 20, 150), health: 5 };
    const r = updateHeli(weak, right, 1 / 60, world, rules);
    expect(r.event).toEqual({ kind: 'crashed' });
    expect(r.heli.mode).toBe('crashed');
    expect(r.heli.health).toBe(0);

    const waiting = run(r.heli, up, 1.5);
    expect(waiting.heli.mode).toBe('crashed');
    const back = run(waiting.heli, none, 1, world, (h) => h.mode !== 'crashed');
    expect(back.events).toEqual(['respawned']);
    expect(back.heli).toMatchObject({ mode: 'flying', health: 100, facing: 1 });
    expect(back.heli.flight).toMatchObject({ x: 60, y: 100, vx: 0, vy: 0 });
  });
});

describe('turning', () => {
  const left: Axis = { x: -1, y: 0 };

  it('faces the way it flies once faster than turnSpeed (owner, 2026-10-20)', () => {
    const { heli } = run(heliAt(400, 40), left, 1);
    expect(heli.flight.vx).toBeLessThan(-50);
    expect(heli.facing).toBe(-1);
    expect(run(heli, right, 1).heli.facing).toBe(1);
  });

  it('keeps its facing below turnSpeed, so small nudges while hovering do not flip it', () => {
    const slow = heliAt(400, 40, 0, -(FLIGHT.turnSpeed - 5));
    expect(updateHeli(slow, none, 1 / 60, world, rules).heli.facing).toBe(1);
    const fast = heliAt(400, 40, 0, -(FLIGHT.turnSpeed + 5));
    expect(updateHeli(fast, none, 1 / 60, world, rules).heli.facing).toBe(-1);
  });

  it('the Turn key flips the way it faces, once per press', () => {
    const h = heliAt(400, 40);
    const once = updateHeli(h, none, 1 / 60, world, rules, true).heli;
    expect(once.facing).toBe(-1);
    expect(updateHeli(once, right, 1 / 60, world, rules).heli.facing).toBe(-1);
    expect(updateHeli(once, none, 1 / 60, world, rules, true).heli.facing).toBe(1);
  });

  it('cannot turn while landed', () => {
    const landed = run(
      heliAt(250, roof.y - shape.bottom - 2),
      none,
      2,
      world,
      (x) => x.mode === 'landed',
    ).heli;
    expect(landed.mode).toBe('landed');
    expect(updateHeli(landed, none, 1 / 60, world, rules, true).heli.facing).toBe(landed.facing);
  });
});

describe('edges and walls', () => {
  it('slides off a roof edge instead of landing half on it', () => {
    // Skids hang 10 px over the left edge.
    const h = heliAt(roof.left - 10 + shape.skidBack, 100);
    const { heli, events } = run(h, none, 30, world, (x) => x.mode === 'landed');
    expect(heli.on).toEqual(street);
    expect(events[0]).toBe('bumped');
    const [, bodyRight] = span(heli.flight.x, 1, shape.bodyBack, shape.bodyFront);
    expect(bodyRight).toBeLessThanOrEqual(roof.left);
  });

  it('stops at a wall when flying into the side of a building', () => {
    const low = heliAt(120, 200);
    const { heli, events } = run(low, right, 3);
    expect(events).toContain('bumped');
    const [, bodyRight] = span(heli.flight.x, 1, shape.bodyBack, shape.bodyFront);
    expect(bodyRight).toBeLessThanOrEqual(roof.left);
  });

  describe('flying into a building costs a little health (owner, 2026-10-20)', () => {
    // Just short of the wall at x 200, flying right at `vx`.
    const at = (vx: number): Heli => heliAt(roof.left - shape.bodyFront - 1, 200, 0, vx);

    it('costs damage by speed above bumpSafeSpeed', () => {
      const r = updateHeli(at(150), none, 1 / 60, world, rules);
      expect(r.event.kind).toBe('bumped');
      const hit = r.event.kind === 'bumped' ? r.event.damage : 0;
      expect(hit).toBeGreaterThan(0);
      // Drag slows it a little during the step: 140 to 150 px/s into the wall.
      expect(hit).toBeGreaterThanOrEqual(bumpDamage(140, landing));
      expect(hit).toBeLessThanOrEqual(bumpDamage(150, landing));
      expect(r.heli.health).toBe(100 - hit);
      expect(r.heli.mode).not.toBe('crashed');
    });

    it('a gentle touch is free, and pushing against the wall does not keep draining it', () => {
      expect(updateHeli(at(20), none, 1 / 60, world, rules).heli.health).toBe(100);
      const first = updateHeli(at(150), right, 1 / 60, world, rules).heli;
      const after = run(first, right, 3).heli;
      expect(after.health).toBe(first.health);
    });

    it('can crash a helicopter with no health left', () => {
      const weak = { ...at(150), health: 1 };
      const r = updateHeli(weak, none, 1 / 60, world, rules);
      expect(r.event.kind).toBe('crashed');
      expect(r.heli).toMatchObject({ mode: 'crashed', health: 0 });
    });
  });

  it('bumpDamage: free up to bumpSafeSpeed, then bumpDamagePerSpeed per px/s, rounded up', () => {
    expect(bumpDamage(0, landing)).toBe(0);
    expect(bumpDamage(30, landing)).toBe(0);
    expect(bumpDamage(31, landing)).toBe(1);
    expect(bumpDamage(160, landing)).toBe(11);
    expect(bumpDamage(160, LANDING)).toBeLessThan(15); // less than one flak hit
  });

  it('flies over a building when high enough', () => {
    const high = heliAt(120, 100);
    const { heli } = run(high, { x: 1, y: -1 }, 3);
    expect(heli.flight.x).toBeGreaterThan(roof.right);
  });
});

describe('people', () => {
  const person = { x: 260, halfWidth: 6, top: roof.y - 20 };
  const withPerson: HeliWorld = { ...world, people: [person] };

  it('never lands on a person: it rests above them instead', () => {
    const { heli, events } = run(heliAt(260, 60), down, 5, withPerson);
    expect(heli.mode).not.toBe('landed');
    expect(heli.flight.y + shape.bottom).toBeCloseTo(person.top);
    expect(events).toContain('blocked');
    expect(heli.health).toBe(100);
  });

  it('lands once moved clear of the person', () => {
    const blocked = run(heliAt(290, 60), none, 10, {
      ...world,
      people: [{ ...person, x: 300 }],
    }).heli;
    expect(blocked.mode).not.toBe('landed');
    const clear = { ...world, people: [{ ...person, x: 210 }] };
    const { heli } = run(blocked, none, 10, clear, (h) => h.mode === 'landed');
    expect(heli.mode).toBe('landed');
  });

  it('ignores people the skids are clear of', () => {
    const aside: HeliWorld = { ...world, people: [{ ...person, x: 205 }] };
    const { heli } = run(heliAt(290, 100), none, 10, aside, (h) => h.mode === 'landed');
    expect(heli.mode).toBe('landed');
  });
});

describe('tuning', () => {
  it('lands safely when sinking with no input', () => {
    expect(FLIGHT.gravity / FLIGHT.dragY).toBeLessThanOrEqual(LANDING.safeSpeed);
  });

  it('makes a full-speed dive a hard landing, but not an instant crash', () => {
    const dive = (FLIGHT.descend + FLIGHT.gravity) / FLIGHT.dragY;
    const damage = landingDamage(dive, LANDING);
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThan(LANDING.maxHealth / 2);
  });

  it('matches the helicopter sprite (108x48, centre origin)', () => {
    expect(HELI_SHAPE.bottom).toBe(24);
    expect(HELI_SHAPE.skidBack + HELI_SHAPE.skidFront).toBeLessThan(108);
  });
});
