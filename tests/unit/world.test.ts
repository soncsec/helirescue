import { describe, expect, it } from 'vitest';
import { WORLD_LIMITS } from '../../src/config/tuning';
import { roofOf, roofs, roofUnder, worldProblems, type WorldMap } from '../../src/logic/world';
import { SKELETON_MAP } from '../../src/missions/skeleton';

const limits = { tile: 16, groundY: 254, minWidth: 480, minSky: 80, personMargin: 8 };
const b = (x: number, width = 4, height = 3): WorldMap['buildings'][number] => ({
  x,
  width,
  height,
  damage: 0,
  helipad: false,
});
const map = (over: Partial<WorldMap> = {}): WorldMap => ({
  width: 960,
  theme: 'night',
  base: b(0, 6, 2),
  buildings: [b(200), b(400)],
  people: [],
  ...over,
});

describe('roofOf', () => {
  it('puts the roof surface on top of the building', () => {
    expect(roofOf(b(100, 5, 4), limits)).toEqual({ left: 100, right: 180, y: 190, base: false });
  });
});

describe('roofs', () => {
  it('lists the base first, then buildings from left to right', () => {
    const r = roofs(map({ buildings: [b(400), b(200)] }), limits);
    expect(r.map((x) => [x.left, x.base])).toEqual([
      [0, true],
      [200, false],
      [400, false],
    ]);
  });
});

describe('worldProblems', () => {
  it('accepts a valid map', () => {
    expect(worldProblems(map(), limits)).toEqual([]);
  });

  it('rejects a level narrower than one screen', () => {
    expect(worldProblems(map({ width: 400, buildings: [] }), limits)).toEqual([
      'width 400 is less than 480',
    ]);
  });

  it('rejects buildings outside the world', () => {
    expect(worldProblems(map({ buildings: [b(-1)] }), limits)).toContain(
      'building 0 is outside the world',
    );
    expect(worldProblems(map({ buildings: [b(900)] }), limits)).toContain(
      'building 0 is outside the world',
    );
    expect(worldProblems(map({ buildings: [b(200.5)] }), limits)).toContain(
      'building 0 is outside the world',
    );
  });

  it('rejects overlapping buildings, including the base', () => {
    expect(worldProblems(map({ buildings: [b(200), b(250)] }), limits)).toEqual([
      'building 0 overlaps building 1',
    ]);
    expect(worldProblems(map({ buildings: [b(50)] }), limits)).toEqual([
      'base overlaps building 0',
    ]);
  });

  it('allows buildings that touch', () => {
    expect(worldProblems(map({ buildings: [b(200), b(264)] }), limits)).toEqual([]);
  });

  it('rejects a building too tall to fly over', () => {
    // groundY 254 - minSky 80 leaves 174 px: 10 tiles fit, 11 do not.
    expect(worldProblems(map({ buildings: [b(200, 4, 10)] }), limits)).toEqual([]);
    expect(worldProblems(map({ buildings: [b(200, 4, 11)] }), limits)).toEqual([
      'building 0 is too tall to fly over',
    ]);
  });
});

describe('people on the map', () => {
  it('finds the building roof under a point, never the base', () => {
    expect(roofUnder(map(), 230, limits)).toEqual(roofOf(b(200), limits));
    expect(roofUnder(map(), 50, limits)).toBeNull();
    expect(roofUnder(map(), 300, limits)).toBeNull();
  });

  it('accepts people standing on building roofs', () => {
    expect(worldProblems(map({ people: [{ x: 230 }, { x: 420 }] }), limits)).toEqual([]);
  });

  it('rejects people in mid-air, on the base, or at a roof edge', () => {
    expect(worldProblems(map({ people: [{ x: 300 }] }), limits)).toEqual([
      'person 0 is not on a building roof',
    ]);
    expect(worldProblems(map({ people: [{ x: 50 }] }), limits)).toEqual([
      'person 0 is not on a building roof',
    ]);
    expect(worldProblems(map({ people: [{ x: 203 }] }), limits)).toEqual([
      'person 0 is too close to the roof edge',
    ]);
  });
});

describe('skeleton map', () => {
  it('follows the world rules', () => {
    expect(worldProblems(SKELETON_MAP, WORLD_LIMITS)).toEqual([]);
  });

  it('has someone to rescue', () => {
    expect(SKELETON_MAP.people.length).toBeGreaterThan(0);
  });

  it('has roofs with a helipad to land on', () => {
    expect(SKELETON_MAP.buildings.filter((x) => x.helipad).length).toBeGreaterThan(0);
  });
});
