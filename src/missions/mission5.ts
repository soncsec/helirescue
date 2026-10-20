import { PEOPLE } from '../config/tuning';
import { group } from '../logic/world';
import type { WorldMap } from '../logic/world';

const g = (x: number, count: number): { x: number }[] => group(x, count, PEOPLE.groupGap);

/**
 * Mission 5 (roadmap M5.4), the last: a mountain town at night, six screens
 * with six groups, 25 people in all. Five guns, eight soldiers, three tanks
 * (two sharing a wide yard), two gunships, and the most frequent jet passes;
 * difficulty() puts the enemy numbers at the end of the curve. As before,
 * each group stands at the far end of its helipad roof, leaving room to land
 * beside it. Building x is in pixels; width and height are in 16-pixel tiles.
 */
export const MISSION_5: WorldMap = {
  width: 2880,
  theme: 'mountain',
  // Drawn with the base sprite (160x96, roof 48 px up), not tiles.
  base: { x: 16, width: 10, height: 3, damage: 0, helipad: true },
  buildings: [
    { x: 220, width: 5, height: 7, damage: 0.3, helipad: false },
    { x: 340, width: 9, height: 6, damage: 0.2, helipad: true }, // roof 340..484
    { x: 540, width: 6, height: 10, damage: 0.4, helipad: false }, // gun
    { x: 680, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 680..840
    // Yard 1: open street from 840 to 1280, with two tanks.
    { x: 1280, width: 6, height: 10, damage: 0.3, helipad: false }, // gun
    { x: 1420, width: 11, height: 8, damage: 0.3, helipad: true }, // roof 1420..1596
    { x: 1640, width: 5, height: 4, damage: 0.5, helipad: false }, // gun on a low roof
    { x: 1760, width: 10, height: 6, damage: 0.2, helipad: true }, // roof 1760..1920
    // Yard 2: open street from 1920 to 2220, with a tank.
    { x: 2220, width: 11, height: 7, damage: 0.3, helipad: true }, // roof 2220..2396
    { x: 2440, width: 6, height: 10, damage: 0.4, helipad: false }, // gun
    { x: 2580, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 2580..2740
    { x: 2780, width: 5, height: 8, damage: 0.3, helipad: false }, // gun
  ],
  aaGuns: [{ x: 588 }, { x: 1328 }, { x: 1680 }, { x: 2488 }, { x: 2820 }],
  // Eight soldiers, all in the street.
  soldiers: [
    { x: 870, patrol: 10 },
    { x: 1060, patrol: 10 },
    { x: 1398, patrol: 8 },
    { x: 1618, patrol: 6 },
    { x: 1740, patrol: 8 },
    { x: 2195, patrol: 8 },
    { x: 2418, patrol: 10 },
    { x: 2760, patrol: 8 },
  ],
  tanks: [
    { x: 945, patrol: 30 },
    { x: 1175, patrol: 30 },
    { x: 2070, patrol: 40 },
  ],
  jets: { first: 20, every: 24 },
  gunships: [
    { x: 1500, y: 46, patrol: 180 },
    { x: 2400, y: 46, patrol: 180 },
  ],
  // Each group's last person stands 8 px in from the roof's right edge.
  people: [...g(452, 3), ...g(796, 4), ...g(1540, 5), ...g(1876, 4), ...g(2340, 5), ...g(2696, 4)],
};
