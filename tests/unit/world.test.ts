import { describe, expect, it } from 'vitest';
import { WORLD_LIMITS } from '../../src/config/tuning';
import { HELI_SHAPE, PEOPLE } from '../../src/config/tuning';
import {
  clearStretch,
  group,
  roofOf,
  roofs,
  roofUnder,
  worldProblems,
  type WorldMap,
} from '../../src/logic/world';
import { MISSION_1 } from '../../src/missions/mission1';
import { SKELETON_MAP } from '../../src/missions/skeleton';

const limits = {
  tile: 16,
  groundY: 254,
  minWidth: 480,
  minSky: 80,
  personMargin: 8,
  landingRoom: 60,
  personHalfWidth: 6,
};
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

  // Roofs wide enough (8 tiles) to land beside one person, so only placement is tested here.
  const wide = (people: WorldMap['people']): WorldMap =>
    map({ buildings: [b(200, 8), b(400, 8)], people });

  it('accepts people standing on building roofs', () => {
    expect(worldProblems(wide([{ x: 230 }, { x: 420 }]), limits)).toEqual([]);
  });

  it('rejects people in mid-air, on the base, or at a roof edge', () => {
    expect(worldProblems(wide([{ x: 350 }]), limits)).toEqual([
      'person 0 is not on a building roof',
    ]);
    expect(worldProblems(wide([{ x: 50 }]), limits)).toEqual([
      'person 0 is not on a building roof',
    ]);
    expect(worldProblems(wide([{ x: 203 }]), limits)).toEqual([
      'person 0 is too close to the roof edge',
    ]);
  });
});

describe('group', () => {
  it('lines people up from x, gap apart', () => {
    expect(group(100, 3, 12)).toEqual([{ x: 100 }, { x: 112 }, { x: 124 }]);
    expect(group(100, 0, 12)).toEqual([]);
  });
});

describe('clearStretch', () => {
  const roof = { left: 200, right: 328, y: 100, base: false };
  it('is the whole roof with nobody on it', () => {
    expect(clearStretch(roof, [], 6)).toBe(128);
  });

  it('is the widest gap beside or between people', () => {
    expect(clearStretch(roof, [300, 312], 6)).toBe(94); // 200..294
    expect(clearStretch(roof, [220, 300], 6)).toBe(68); // 226..294
    expect(clearStretch(roof, [312, 210, 300], 6)).toBe(78); // 216..294, any order
  });
});

describe('room to land beside people', () => {
  it('flags a roof whose people leave no clear stretch for the skids', () => {
    // Roof 200..264 (4 tiles): one person in the middle leaves 26 px either side.
    expect(worldProblems(map({ people: [{ x: 232 }] }), limits)).toEqual([
      'building 0 has no room to land beside its people',
    ]);
    // A wider roof (8 tiles, 200..328) with the person near one end is fine.
    expect(worldProblems(map({ buildings: [b(200, 8)], people: [{ x: 310 }] }), limits)).toEqual(
      [],
    );
  });

  it('uses the skid span from the helicopter shape', () => {
    // Room for the skids facing either way: the longer side, on both sides of the centre.
    const reach = Math.max(HELI_SHAPE.skidBack, HELI_SHAPE.skidFront);
    expect(WORLD_LIMITS.landingRoom).toBeGreaterThan(2 * reach);
    expect(WORLD_LIMITS.personHalfWidth).toBe(PEOPLE.halfWidth);
  });
});

describe('mission 1 map', () => {
  it('follows the world rules', () => {
    expect(worldProblems(MISSION_1, WORLD_LIMITS)).toEqual([]);
  });

  it('is 4 screens wide (scope: about 4 to 6)', () => {
    expect(MISSION_1.width).toBe(4 * 480);
  });

  it('has groups on several roofs, more people than one trip carries', () => {
    const rs = roofs(MISSION_1, WORLD_LIMITS);
    const perRoof = rs
      .map((r) => MISSION_1.people.filter((p) => p.x >= r.left && p.x <= r.right).length)
      .filter((n) => n > 0);
    expect(perRoof.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...perRoof)).toBeGreaterThanOrEqual(2);
    expect(MISSION_1.people.length).toBeGreaterThan(PEOPLE.capacity);
  });

  it('starts with a low first building, so a low take-off meets a wall', () => {
    const first = [...MISSION_1.buildings].sort((a, z) => a.x - z.x)[0];
    expect(first?.height).toBeGreaterThanOrEqual(4);
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
