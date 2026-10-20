import { PEOPLE } from '../config/tuning';
import { group } from '../logic/world';
import type { WorldMap } from '../logic/world';

const g = (x: number, count: number): { x: number }[] => group(x, count, PEOPLE.groupGap);

/**
 * Mission 2 (roadmap M5.1, M5.2): five and a third screens of factory
 * district, with six groups, 19 people in all, so a full rescue takes at
 * least two trips. More guns and soldiers than mission 1, and difficulty()
 * makes them fire a little more often. A tank patrols the open factory yard
 * in the middle, guarding the roofs either side (the VTOL jet joins in M5.3).
 * As in mission 1, each group stands at the far end of its helipad roof,
 * leaving room to land beside it, and the guns stand on tall roofs with
 * nobody on them. Building x is in pixels; width and height are in 16-pixel
 * tiles.
 */
export const MISSION_2: WorldMap = {
  width: 2560,
  theme: 'war',
  // Drawn with the base sprite (160x96, roof 48 px up), not tiles.
  base: { x: 16, width: 10, height: 3, damage: 0, helipad: true },
  buildings: [
    { x: 220, width: 5, height: 7, damage: 0.3, helipad: false },
    { x: 330, width: 9, height: 6, damage: 0.2, helipad: true }, // roof 330..474
    { x: 530, width: 6, height: 9, damage: 0.4, helipad: false }, // gun
    { x: 660, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 660..820
    // The factory yard: open street from 820 to 1160, with the tank.
    { x: 1160, width: 9, height: 8, damage: 0.3, helipad: true }, // roof 1160..1304
    { x: 1360, width: 6, height: 10, damage: 0.3, helipad: false }, // gun
    { x: 1500, width: 10, height: 6, damage: 0.2, helipad: true }, // roof 1500..1660
    { x: 1720, width: 5, height: 4, damage: 0.5, helipad: false }, // soldier
    { x: 1850, width: 9, height: 7, damage: 0.3, helipad: true }, // roof 1850..1994
    { x: 2050, width: 6, height: 10, damage: 0.4, helipad: false }, // gun
    { x: 2200, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 2200..2360
    { x: 2420, width: 5, height: 8, damage: 0.3, helipad: false },
  ],
  // Three anti-aircraft guns, one for each pair of groups.
  aaGuns: [{ x: 578 }, { x: 1408 }, { x: 2098 }],
  // Five soldiers: two in the yard, two in street gaps, one on a low roof.
  soldiers: [
    { x: 850, patrol: 14 },
    { x: 1130, patrol: 12 },
    { x: 1478, patrol: 10 },
    { x: 1760, patrol: 14 },
    { x: 2173, patrol: 12 },
  ],
  // One tank in the yard (M5.2).
  tanks: [{ x: 990, patrol: 50 }],
  // Each group's last person stands 8 px in from the roof's right edge.
  people: [...g(442, 3), ...g(776, 4), ...g(1272, 3), ...g(1628, 3), ...g(1962, 3), ...g(2328, 3)],
};
