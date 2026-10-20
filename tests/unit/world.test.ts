import { describe, expect, it } from 'vitest';
import { WORLD_LIMITS } from '../../src/config/tuning';
import { DIFFICULTY, HELI_SHAPE, PEOPLE, SAVE } from '../../src/config/tuning';
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
import { MISSIONS, missionAt } from '../../src/missions';

const limits = {
  tile: 16,
  groundY: 254,
  minWidth: 480,
  minSky: 80,
  personMargin: 8,
  landingRoom: 60,
  personHalfWidth: 6,
  tankHalfWidth: 50,
  jetGap: 15,
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

describe('anti-aircraft guns on the map', () => {
  const wide = (aaGuns: { x: number }[], people: WorldMap['people'] = []): WorldMap =>
    map({ buildings: [b(200, 8), b(400, 8)], people, aaGuns });
  it('must stand on a building roof without people, away from the edge', () => {
    expect(worldProblems(wide([{ x: 250 }]), limits)).toEqual([]);
    expect(worldProblems(wide([{ x: 350 }]), limits)).toEqual(['gun 0 is not on a building roof']);
    expect(worldProblems(wide([{ x: 203 }]), limits)).toEqual([
      'gun 0 is too close to the roof edge',
    ]);
    expect(worldProblems(wide([{ x: 250 }], [{ x: 310 }]), limits)).toEqual([
      'gun 0 shares a roof with people',
    ]);
  });
});

describe('soldiers on the map', () => {
  const at = (
    soldiers: { x: number; patrol: number }[],
    people: WorldMap['people'] = [],
  ): WorldMap => map({ buildings: [b(200, 8), b(400, 8)], people, soldiers });
  it('patrol a roof without people, or the street between buildings', () => {
    expect(worldProblems(at([{ x: 260, patrol: 20 }]), limits)).toEqual([]);
    expect(worldProblems(at([{ x: 364, patrol: 20 }]), limits)).toEqual([]); // street gap 328..400
    expect(worldProblems(at([{ x: 260, patrol: 60 }]), limits)).toEqual([
      'soldier 0 walks off the roof',
    ]);
    expect(worldProblems(at([{ x: 364, patrol: 40 }]), limits)).toEqual([
      'soldier 0 walks into a building',
    ]);
    expect(worldProblems(at([{ x: 260, patrol: 10 }], [{ x: 310 }]), limits)).toEqual([
      'soldier 0 shares a roof with people',
    ]);
  });
});

describe('tanks on the map (M5.2)', () => {
  // Buildings at 200..328 and 400..528; open street from 528 to the end (960).
  const at = (tanks: { x: number; patrol: number }[]): WorldMap =>
    map({ buildings: [b(200, 8), b(400, 8)], tanks });
  it('patrol an open stretch of street, clear of buildings and the world edge', () => {
    expect(worldProblems(at([{ x: 700, patrol: 50 }]), limits)).toEqual([]);
    expect(worldProblems(at([{ x: 600, patrol: 30 }]), limits)).toEqual([
      'tank 0 drives into a building',
    ]);
    expect(worldProblems(at([{ x: 880, patrol: 40 }]), limits)).toEqual([
      'tank 0 drives into a building',
    ]);
    expect(worldProblems(at([{ x: 700, patrol: -1 }]), limits)).toEqual([
      'tank 0 has a negative patrol',
    ]);
  });
});

describe('jets on the map (M5.3)', () => {
  it('come now and then, never in a stream', () => {
    expect(worldProblems(map({ jets: { first: 20, every: 30 } }), limits)).toEqual([]);
    for (const jets of [
      { first: 5, every: 30 },
      { first: 20, every: 10 },
      { first: Number.NaN, every: 30 },
    ]) {
      expect(worldProblems(map({ jets }), limits)).toEqual([
        'jet passes come less than 15 s apart',
      ]);
    }
  });
});

describe.each(MISSIONS.map((m, i) => ({ n: i + 1, ...m })))('mission $n map', ({ n, map: m }) => {
  it('follows the world rules', () => {
    expect(worldProblems(m, WORLD_LIMITS)).toEqual([]);
  });

  it('is 4 to 6 screens wide (scope)', () => {
    expect(m.width).toBeGreaterThanOrEqual(4 * 480);
    expect(m.width).toBeLessThanOrEqual(6 * 480);
  });

  it('has groups on several roofs, more people than one trip carries', () => {
    const rs = roofs(m, WORLD_LIMITS);
    const perRoof = rs
      .map((r) => m.people.filter((p) => p.x >= r.left && p.x <= r.right).length)
      .filter((k) => k > 0);
    expect(perRoof.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...perRoof)).toBeGreaterThanOrEqual(2);
    expect(m.people.length).toBeGreaterThan(PEOPLE.capacity);
  });

  it('has anti-aircraft guns and soldiers (M3.6)', () => {
    expect(m.aaGuns?.length).toBeGreaterThanOrEqual(1);
    expect(m.soldiers?.length).toBeGreaterThanOrEqual(1);
  });

  it('has roofs with a helipad to land on', () => {
    expect(m.buildings.filter((x) => x.helipad).length).toBeGreaterThan(0);
  });

  it('starts with a low first building, so a low take-off meets a wall', () => {
    const first = [...m.buildings].sort((a, z) => a.x - z.x)[0];
    expect(first?.height).toBeGreaterThanOrEqual(4);
  });

  it('has tanks from mission 2 (M5.2)', () => {
    expect((m.tanks?.length ?? 0) > 0).toBe(n >= 2);
  });

  it('has jet passes from mission 2 (M5.3)', () => {
    expect(m.jets !== undefined).toBe(n >= 2);
  });

  it('has at least as many people and enemies as the mission before', () => {
    const before = MISSIONS[n - 2]?.map;
    if (!before) return;
    expect(m.people.length).toBeGreaterThanOrEqual(before.people.length);
    expect(m.aaGuns?.length ?? 0).toBeGreaterThanOrEqual(before.aaGuns?.length ?? 0);
    expect(m.soldiers?.length ?? 0).toBeGreaterThanOrEqual(before.soldiers?.length ?? 0);
    expect(m.tanks?.length ?? 0).toBeGreaterThanOrEqual(before.tanks?.length ?? 0);
  });
});

describe('missions', () => {
  it('mission 1 is the play-tested map, 4 screens of night city', () => {
    expect(missionAt(1).map).toBe(MISSION_1);
    expect(MISSION_1.width).toBe(4 * 480);
    expect(MISSION_1.theme).toBe('night');
  });

  it('each mission has its own look (M5.4)', () => {
    expect(MISSIONS.map((m) => m.map.theme)).toEqual(
      ['night', 'war', 'downtown', 'harbour', 'mountain'].slice(0, MISSIONS.length),
    );
  });

  it('has no more missions than the saved data and the difficulty curve allow', () => {
    expect(MISSIONS.length).toBeLessThanOrEqual(SAVE.missions);
    expect(MISSIONS.length).toBeLessThanOrEqual(DIFFICULTY.lastMission);
    expect(new Set(MISSIONS.map((m) => m.name)).size).toBe(MISSIONS.length);
  });

  it('rejects a mission that does not exist', () => {
    expect(() => missionAt(0)).toThrow(RangeError);
    expect(() => missionAt(MISSIONS.length + 1)).toThrow(RangeError);
  });
});
