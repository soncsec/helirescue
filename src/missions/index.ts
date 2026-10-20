import type { WorldMap } from '../logic/world';
import { MISSION_1 } from './mission1';
import { MISSION_2 } from './mission2';
import { MISSION_3 } from './mission3';

/** One mission (H4): its name, shown as it starts and on the result screen, and its map. */
export interface Mission {
  name: string;
  map: WorldMap;
}

/**
 * Every mission in order; mission n is MISSIONS[n - 1]. Missions 4 and 5
 * follow in M5.4.
 */
export const MISSIONS: readonly Mission[] = [
  { name: 'NIGHT CITY', map: MISSION_1 },
  { name: 'FACTORY DISTRICT', map: MISSION_2 },
  { name: 'DOWNTOWN', map: MISSION_3 },
];

/** Mission n (from 1). */
export function missionAt(n: number): Mission {
  const m = MISSIONS[n - 1];
  if (!m) throw new RangeError(`there is no mission ${n}`);
  return m;
}
