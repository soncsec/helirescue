import { PEOPLE } from '../config/tuning';
import { group } from '../logic/world';
import type { WorldMap } from '../logic/world';

const g = (x: number, count: number): { x: number }[] => group(x, count, PEOPLE.groupGap);

/**
 * Mission 3 (roadmap M5.4): downtown by day, five and two-thirds screens with
 * six groups, 21 people in all. Four guns, six soldiers, two tanks in two
 * open yards, and a VTOL jet pass about every half minute; difficulty()
 * puts the enemy numbers halfway along the curve. As before, each group
 * stands at the far end of its helipad roof, leaving room to land beside it.
 * Building x is in pixels; width and height are in 16-pixel tiles.
 */
export const MISSION_3: WorldMap = {
  width: 2720,
  theme: 'downtown',
  // Drawn with the base sprite (160x96, roof 48 px up), not tiles.
  base: { x: 16, width: 10, height: 3, damage: 0, helipad: true },
  buildings: [
    { x: 220, width: 5, height: 6, damage: 0.2, helipad: false },
    { x: 340, width: 9, height: 7, damage: 0.1, helipad: true }, // roof 340..484
    { x: 540, width: 6, height: 10, damage: 0.3, helipad: false }, // gun
    { x: 680, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 680..840
    // Yard 1: open street from 840 to 1180, with a tank.
    { x: 1180, width: 9, height: 8, damage: 0.2, helipad: true }, // roof 1180..1324
    { x: 1380, width: 6, height: 10, damage: 0.4, helipad: false }, // gun
    { x: 1520, width: 10, height: 6, damage: 0.2, helipad: true }, // roof 1520..1680
    { x: 1740, width: 5, height: 4, damage: 0.5, helipad: false }, // gun on a low roof
    { x: 1870, width: 9, height: 7, damage: 0.3, helipad: true }, // roof 1870..2014
    // Yard 2: open street from 2014 to 2360, with a tank.
    { x: 2360, width: 6, height: 10, damage: 0.3, helipad: false }, // gun
    { x: 2500, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 2500..2660
  ],
  aaGuns: [{ x: 588 }, { x: 1428 }, { x: 1780 }, { x: 2408 }],
  // Six soldiers, all in the street: two in yard 1, three in gaps, one in yard 2.
  soldiers: [
    { x: 870, patrol: 12 },
    { x: 1150, patrol: 10 },
    { x: 1498, patrol: 10 },
    { x: 1710, patrol: 10 },
    { x: 1842, patrol: 8 },
    { x: 2335, patrol: 10 },
  ],
  tanks: [
    { x: 1010, patrol: 50 },
    { x: 2187, patrol: 50 },
  ],
  jets: { first: 25, every: 30 },
  // Each group's last person stands 8 px in from the roof's right edge.
  people: [...g(452, 3), ...g(796, 4), ...g(1292, 3), ...g(1636, 4), ...g(1982, 3), ...g(2616, 4)],
};
