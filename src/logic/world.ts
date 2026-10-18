/**
 * Engine-free world rules (H1, H4): checks a mission's map and works out where
 * the roofs are. Plain TypeScript, unit tested.
 */
import type { BuildingOptions } from './buildingLayout';

export type Theme = 'night' | 'war';

/** A building on the map. `x` is its left edge in pixels; size is in tiles. */
export interface PlacedBuilding extends BuildingOptions {
  x: number;
}

export interface WorldMap {
  /** Width of the level in pixels. */
  width: number;
  theme: Theme;
  /** The base the helicopter starts from and unloads at, drawn like a building. */
  base: PlacedBuilding;
  buildings: readonly PlacedBuilding[];
  /** People waiting to be rescued, by x position; each stands on the building roof below. */
  people: readonly { x: number }[];
}

export interface WorldLimits {
  /** Size of one building tile in pixels. */
  tile: number;
  /** Top of the street, in pixels from the top of the world. */
  groundY: number;
  /** Narrowest allowed level: at least one screen. */
  minWidth: number;
  /** Clear sky to keep above the tallest roof, in pixels. */
  minSky: number;
  /** People stand at least this far in from a roof edge. */
  personMargin: number;
}

/** A flat roof surface: where the helicopter can land and people wait. */
export interface Roof {
  left: number;
  right: number;
  /** Height of the roof surface (pixels from the top of the world). */
  y: number;
  /** True for the base. */
  base: boolean;
}

/** The roof surface of one building. */
export function roofOf(
  b: PlacedBuilding,
  limits: Pick<WorldLimits, 'tile' | 'groundY'>,
  base = false,
): Roof {
  return {
    left: b.x,
    right: b.x + b.width * limits.tile,
    y: limits.groundY - b.height * limits.tile,
    base,
  };
}

/** Every roof in the world, base first, then the buildings from left to right. */
export function roofs(world: WorldMap, limits: WorldLimits): Roof[] {
  return [
    roofOf(world.base, limits, true),
    ...[...world.buildings].sort((a, b) => a.x - b.x).map((b) => roofOf(b, limits)),
  ];
}

/** The building roof (not the base) that x is over, or null. */
export function roofUnder(world: WorldMap, x: number, limits: WorldLimits): Roof | null {
  const b = world.buildings.find((b) => x >= b.x && x <= b.x + b.width * limits.tile);
  return b ? roofOf(b, limits) : null;
}

/**
 * Lists everything wrong with a map: too narrow, buildings outside the level,
 * overlapping each other or the base, too tall to fly over, or people not
 * standing on a building roof.
 * Returns an empty list when the map is valid.
 */
export function worldProblems(world: WorldMap, limits: WorldLimits): string[] {
  const problems: string[] = [];
  if (!(world.width >= limits.minWidth)) {
    problems.push(`width ${world.width} is less than ${limits.minWidth}`);
  }
  const all = [
    { name: 'base', b: world.base },
    ...world.buildings.map((b, i) => ({ name: `building ${i}`, b })),
  ];
  const tallest = limits.groundY - limits.minSky;
  for (const { name, b } of all) {
    const r = roofOf(b, limits);
    if (!Number.isInteger(b.x) || r.left < 0 || r.right > world.width) {
      problems.push(`${name} is outside the world`);
    }
    if (limits.groundY - r.y > tallest) problems.push(`${name} is too tall to fly over`);
  }
  const sorted = [...all].sort((a, b) => a.b.x - b.b.x);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev && cur && roofOf(prev.b, limits).right > cur.b.x) {
      problems.push(`${prev.name} overlaps ${cur.name}`);
    }
  }
  world.people.forEach((p, i) => {
    const r = roofUnder(world, p.x, limits);
    if (!r) problems.push(`person ${i} is not on a building roof`);
    else if (p.x < r.left + limits.personMargin || p.x > r.right - limits.personMargin) {
      problems.push(`person ${i} is too close to the roof edge`);
    }
  });
  return problems;
}
