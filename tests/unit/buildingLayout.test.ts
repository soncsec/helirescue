import { describe, expect, it } from 'vitest';
import { layoutBuilding } from '../../src/logic/buildingLayout';
import { createRng } from '../../src/logic/rng';

const base = { width: 6, height: 5, damage: 0, helipad: false };

describe('layoutBuilding', () => {
  it('has the requested size', () => {
    const rows = layoutBuilding(base, createRng(1));
    expect(rows).toHaveLength(5);
    for (const row of rows) expect(row).toHaveLength(6);
  });

  it('puts a flat roof on top with edge tiles at both ends', () => {
    const [roof] = layoutBuilding(base, createRng(1));
    expect(roof).toEqual(['roofLeft', 'roofMid', 'roofMid', 'roofMid', 'roofMid', 'roofRight']);
  });

  it('puts a landing stripe in the middle of the roof when asked', () => {
    const [roof] = layoutBuilding({ ...base, helipad: true }, createRng(1));
    expect(roof?.[3]).toBe('helipad');
    expect(roof?.filter((t) => t === 'helipad')).toHaveLength(1);
  });

  it('uses edge walls below the roof', () => {
    for (const row of layoutBuilding(base, createRng(3)).slice(1)) {
      expect(row[0]).toBe('wallLeft');
      expect(row.at(-1)).toBe('wallRight');
    }
  });

  it('gives the ground floor exactly one door', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const ground = layoutBuilding(base, createRng(seed)).at(-1) ?? [];
      expect(ground.filter((t) => t === 'door')).toHaveLength(1);
    }
  });

  it('has no broken windows when undamaged and only broken ones when fully damaged', () => {
    const intact = layoutBuilding({ ...base, height: 8 }, createRng(9)).flat();
    expect(intact).not.toContain('windowBroken');
    const ruined = layoutBuilding({ ...base, height: 8, damage: 1 }, createRng(9)).slice(1, -1);
    for (const row of ruined)
      expect(row.slice(1, -1).every((t) => t === 'windowBroken')).toBe(true);
  });

  it('gives the same building for the same seed', () => {
    expect(layoutBuilding(base, createRng(42))).toEqual(layoutBuilding(base, createRng(42)));
  });

  it('rejects sizes that cannot form a building', () => {
    expect(() => layoutBuilding({ ...base, width: 2 }, createRng(1))).toThrow(RangeError);
    expect(() => layoutBuilding({ ...base, height: 1 }, createRng(1))).toThrow(RangeError);
    expect(() => layoutBuilding({ ...base, width: 4.5 }, createRng(1))).toThrow(RangeError);
    expect(() => layoutBuilding({ ...base, damage: 2 }, createRng(1))).toThrow(RangeError);
    expect(() => layoutBuilding({ ...base, damage: Number.NaN }, createRng(1))).toThrow(RangeError);
  });

  it('works at the smallest size', () => {
    const rows = layoutBuilding({ width: 3, height: 2, damage: 0, helipad: true }, createRng(5));
    expect(rows[0]).toEqual(['roofLeft', 'helipad', 'roofRight']);
    expect(rows[1]).toEqual(['wallLeft', 'door', 'wallRight']);
  });
});
