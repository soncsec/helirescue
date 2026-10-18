import type { WorldMap } from '../logic/world';

/**
 * Walking-skeleton map (roadmap M2): three screens of night city with the base
 * at the left end. The real mission format comes in M5 (H4).
 * Building x is in pixels; width and height are in 16-pixel tiles.
 */
export const SKELETON_MAP: WorldMap = {
  width: 1440,
  theme: 'night',
  base: { x: 16, width: 8, height: 2, damage: 0, helipad: true },
  buildings: [
    { x: 200, width: 5, height: 6, damage: 0.2, helipad: false },
    { x: 330, width: 7, height: 8, damage: 0.1, helipad: true },
    { x: 520, width: 5, height: 10, damage: 0.3, helipad: false },
    { x: 650, width: 8, height: 5, damage: 0.2, helipad: true },
    { x: 840, width: 6, height: 9, damage: 0.4, helipad: false },
    { x: 980, width: 9, height: 7, damage: 0.3, helipad: true },
    { x: 1170, width: 5, height: 4, damage: 0.5, helipad: false },
    { x: 1280, width: 8, height: 8, damage: 0.2, helipad: true },
  ],
};
