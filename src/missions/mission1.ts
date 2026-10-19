import { PEOPLE } from '../config/tuning';
import { group } from '../logic/world';
import type { WorldMap } from '../logic/world';

const g = (x: number, count: number): { x: number }[] => group(x, count, PEOPLE.groupGap);

/**
 * Mission 1 (roadmap M3.1): four screens of night city with the base at the
 * left end and five groups waiting on helipad roofs, 16 people in all. The
 * helicopter carries 10, so a full rescue takes at least two trips. Each
 * group stands at the far end of its roof, leaving room to land beside it.
 * Building x is in pixels; width and height are in 16-pixel tiles. The
 * mission format with enemies and a difficulty() comes in M5 (H4).
 */
export const MISSION_1: WorldMap = {
  width: 1920,
  theme: 'night',
  // Drawn with the base sprite (160x96, roof 48 px up), not tiles.
  base: { x: 16, width: 10, height: 3, damage: 0, helipad: true },
  buildings: [
    { x: 230, width: 5, height: 6, damage: 0.2, helipad: false },
    { x: 340, width: 9, height: 7, damage: 0.1, helipad: true }, // roof 340..484
    { x: 540, width: 5, height: 10, damage: 0.3, helipad: false },
    { x: 670, width: 10, height: 5, damage: 0.2, helipad: true }, // roof 670..830
    { x: 890, width: 6, height: 9, damage: 0.4, helipad: false },
    { x: 1040, width: 9, height: 8, damage: 0.2, helipad: true }, // roof 1040..1184
    { x: 1240, width: 5, height: 4, damage: 0.5, helipad: false },
    { x: 1370, width: 9, height: 7, damage: 0.3, helipad: true }, // roof 1370..1514
    { x: 1570, width: 6, height: 10, damage: 0.3, helipad: false },
    { x: 1720, width: 10, height: 6, damage: 0.2, helipad: true }, // roof 1720..1880
  ],
  // Each group's last person stands 8 px in from the roof's right edge.
  people: [...g(452, 3), ...g(786, 4), ...g(1152, 3), ...g(1482, 3), ...g(1848, 3)],
};
