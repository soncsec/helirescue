import { PEOPLE } from '../config/tuning';
import { group } from '../logic/world';
import type { WorldMap } from '../logic/world';

const g = (x: number, count: number): { x: number }[] => group(x, count, PEOPLE.groupGap);

/**
 * Mission 2 (roadmap M5.1): five screens of factory district, with six
 * groups, 19 people in all, so a full rescue takes at least two trips. More
 * guns and soldiers than mission 1, and difficulty() makes them fire a little
 * more often (tanks and the VTOL jet join in M5.2 and M5.3). As in mission 1,
 * each group stands at the far end of its helipad roof, leaving room to land
 * beside it, and the guns stand on tall roofs with nobody on them. Building x
 * is in pixels; width and height are in 16-pixel tiles.
 */
export const MISSION_2: WorldMap = {
  width: 2400,
  theme: 'war',
  // Drawn with the base sprite (160x96, roof 48 px up), not tiles.
  base: { x: 16, width: 10, height: 3, damage: 0, helipad: true },
  buildings: [
    { x: 220, width: 5, height: 7, damage: 0.3, helipad: false },
    { x: 330, width: 9, height: 6, damage: 0.2, helipad: true }, // roof 330..474
    { x: 530, width: 6, height: 9, damage: 0.4, helipad: false }, // gun
    { x: 660, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 660..820
    { x: 880, width: 5, height: 3, damage: 0.5, helipad: false }, // soldier
    { x: 1010, width: 9, height: 8, damage: 0.3, helipad: true }, // roof 1010..1154
    { x: 1210, width: 6, height: 10, damage: 0.3, helipad: false }, // gun
    { x: 1350, width: 10, height: 6, damage: 0.2, helipad: true }, // roof 1350..1510
    { x: 1570, width: 5, height: 4, damage: 0.5, helipad: false }, // soldier
    { x: 1700, width: 9, height: 7, damage: 0.3, helipad: true }, // roof 1700..1844
    { x: 1900, width: 6, height: 10, damage: 0.4, helipad: false }, // gun
    { x: 2050, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 2050..2210
    { x: 2270, width: 5, height: 8, damage: 0.3, helipad: false },
  ],
  // Three anti-aircraft guns, one for each pair of groups.
  aaGuns: [{ x: 578 }, { x: 1258 }, { x: 1948 }],
  // Five soldiers: three in the street gaps beside groups, two on low roofs.
  soldiers: [
    { x: 850, patrol: 14 },
    { x: 920, patrol: 16 },
    { x: 1328, patrol: 10 },
    { x: 1610, patrol: 14 },
    { x: 2023, patrol: 12 },
  ],
  // Each group's last person stands 8 px in from the roof's right edge.
  people: [...g(442, 3), ...g(776, 4), ...g(1122, 3), ...g(1478, 3), ...g(1812, 3), ...g(2178, 3)],
};
