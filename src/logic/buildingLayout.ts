import type { Rng } from './rng';

/** Tile names in a building tile sheet (tools/art/buildings.mjs draws them in this order). */
export type TileName =
  | 'roofLeft'
  | 'roofMid'
  | 'roofRight'
  | 'wallLeft'
  | 'windowLit'
  | 'windowDark'
  | 'windowBroken'
  | 'wallRight'
  | 'wallPlain'
  | 'door'
  | 'sign'
  | 'helipad';

export interface BuildingOptions {
  /** Width in tiles, at least 3 (two edges plus one middle column). */
  width: number;
  /** Height in tiles, at least 2 (a roof row plus the ground floor). */
  height: number;
  /** 0 = intact, 1 = every window broken. */
  damage: number;
  /** Puts a landing stripe in the middle of the roof. */
  helipad: boolean;
}

/**
 * Lays out a building as rows of tile names, top (roof) to bottom (street).
 * Edges use the edge tiles; the ground floor has one door; windows are picked
 * with the seeded RNG so the same seed always gives the same building.
 */
export function layoutBuilding(opts: BuildingOptions, rng: Rng): TileName[][] {
  const { width, height, damage, helipad } = opts;
  if (!Number.isInteger(width) || width < 3)
    throw new RangeError('width must be a whole number >= 3');
  if (!Number.isInteger(height) || height < 2)
    throw new RangeError('height must be a whole number >= 2');
  if (!(damage >= 0 && damage <= 1)) throw new RangeError('damage must be between 0 and 1');

  const rows: TileName[][] = [];
  const roof: TileName[] = [];
  for (let x = 0; x < width; x++) {
    if (x === 0) roof.push('roofLeft');
    else if (x === width - 1) roof.push('roofRight');
    else roof.push(helipad && x === Math.floor(width / 2) ? 'helipad' : 'roofMid');
  }
  rows.push(roof);

  const middle = (): TileName => {
    if (rng.next() < damage) return 'windowBroken';
    const r = rng.next();
    if (r < 0.15) return 'wallPlain';
    return r < 0.5 ? 'windowLit' : 'windowDark';
  };
  for (let y = 1; y < height; y++) {
    const row: TileName[] = ['wallLeft'];
    const ground = y === height - 1;
    const door = ground ? rng.int(1, width - 2) : -1;
    for (let x = 1; x < width - 1; x++) {
      if (x === door) row.push('door');
      else if (ground && x === door - 1) row.push('sign');
      else row.push(middle());
    }
    row.push('wallRight');
    rows.push(row);
  }
  return rows;
}
