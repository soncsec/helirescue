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
  /** Anti-aircraft guns, by x position, on building roofs without people (M3.6). */
  aaGuns?: readonly { x: number }[];
  /**
   * Soldiers (M3.6): they patrol `patrol` px either side of x, on the roof
   * below (without people) or, between buildings, on the street.
   */
  soldiers?: readonly { x: number; patrol: number }[];
  /**
   * Tanks (M5.2): they drive `patrol` px either side of x along the street,
   * in an open stretch with no buildings.
   */
  tanks?: readonly { x: number; patrol: number }[];
}

/** Where a soldier stands and walks: on a roof, or on the street in a gap between buildings. */
export function soldierPost(
  world: WorldMap,
  s: { x: number; patrol: number },
  limits: WorldLimits,
): { y: number; minX: number; maxX: number; roof: Roof | null } {
  const roof = roofUnder(world, s.x, limits);
  return { y: roof ? roof.y : limits.groundY, minX: s.x - s.patrol, maxX: s.x + s.patrol, roof };
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
  /** Clear stretch a roof with people must keep, so the helicopter can land beside them. */
  landingRoom: number;
  /** Roof taken up by one person either side of their x. */
  personHalfWidth: number;
  /** A tank's drawn half width: its patrol keeps this clear of buildings. */
  tankHalfWidth: number;
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

/** A group of `count` people standing in a row from x, `gap` pixels apart. */
export function group(x: number, count: number, gap: number): { x: number }[] {
  return Array.from({ length: count }, (_, i) => ({ x: x + i * gap }));
}

/** The widest stretch of `roof` not taken up by people standing at `xs`. */
export function clearStretch(roof: Roof, xs: readonly number[], halfWidth: number): number {
  let widest = 0;
  let from = roof.left;
  for (const x of [...xs].sort((a, b) => a - b)) {
    widest = Math.max(widest, x - halfWidth - from);
    from = Math.max(from, x + halfWidth);
  }
  return Math.max(widest, roof.right - from);
}

/**
 * Lists everything wrong with a map: too narrow, buildings outside the level,
 * overlapping each other or the base, too tall to fly over, people not
 * standing on a building roof, or a group leaving no room to land beside it.
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
  (world.aaGuns ?? []).forEach((g, i) => {
    const r = roofUnder(world, g.x, limits);
    if (!r) problems.push(`gun ${i} is not on a building roof`);
    else if (g.x < r.left + limits.personMargin || g.x > r.right - limits.personMargin) {
      problems.push(`gun ${i} is too close to the roof edge`);
    } else if (world.people.some((p) => p.x >= r.left && p.x <= r.right)) {
      problems.push(`gun ${i} shares a roof with people`);
    }
  });
  const solid = [
    roofOf(world.base, limits, true),
    ...world.buildings.map((b) => roofOf(b, limits)),
  ];
  (world.soldiers ?? []).forEach((s, i) => {
    const post = soldierPost(world, s, limits);
    const lo = post.minX - limits.personMargin;
    const hi = post.maxX + limits.personMargin;
    if (!(s.patrol >= 0)) problems.push(`soldier ${i} has a negative patrol`);
    else if (post.roof) {
      const r = post.roof;
      if (lo < r.left || hi > r.right) problems.push(`soldier ${i} walks off the roof`);
      else if (world.people.some((p) => p.x >= r.left && p.x <= r.right)) {
        problems.push(`soldier ${i} shares a roof with people`);
      }
    } else if (lo < 0 || hi > world.width || solid.some((r) => hi > r.left && lo < r.right)) {
      problems.push(`soldier ${i} walks into a building`);
    }
  });
  (world.tanks ?? []).forEach((k, i) => {
    const lo = k.x - k.patrol - limits.tankHalfWidth;
    const hi = k.x + k.patrol + limits.tankHalfWidth;
    if (!(k.patrol >= 0)) problems.push(`tank ${i} has a negative patrol`);
    else if (lo < 0 || hi > world.width || solid.some((r) => hi > r.left && lo < r.right)) {
      problems.push(`tank ${i} drives into a building`);
    }
  });
  world.buildings.forEach((b, i) => {
    const r = roofOf(b, limits);
    const xs = world.people.map((p) => p.x).filter((x) => x >= r.left && x <= r.right);
    if (xs.length > 0 && clearStretch(r, xs, limits.personHalfWidth) < limits.landingRoom) {
      problems.push(`building ${i} has no room to land beside its people`);
    }
  });
  return problems;
}
