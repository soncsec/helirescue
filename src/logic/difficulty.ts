/**
 * The difficulty curve (roadmap M5.1, H4). Plain TypeScript, unit tested.
 *
 * Every difficulty number comes from here, worked out from mission 1's
 * numbers (which the owner play-tested and approved), so the limits are
 * checked in one place:
 * - mission 1 is exactly the base numbers;
 * - guns and soldiers fire more often each mission, by the same percentage
 *   each time, reaching at most twice mission 1's rate at the last mission;
 * - their shots get faster, at most 30% faster by the last mission;
 * - they open fire from further away, at most 20% further by the last mission;
 * - damage per hit, hit points and the grace period before a first shot never
 *   change, so a hit always costs the same and every mission starts fair.
 * How many enemies each mission has is part of its map (src/missions/).
 */
import type { EnemyTuning } from './enemies';
import type { SoldierTuning } from './soldiers';

export interface DifficultyCurve {
  /** The last mission (5). */
  lastMission: number;
  /** Fire rate at the last mission, as a multiple of mission 1's. */
  fireRateAtLast: number;
  /** Shot speed at the last mission, as a multiple of mission 1's. */
  shotSpeedAtLast: number;
  /** Firing range at the last mission, as a multiple of mission 1's. */
  rangeAtLast: number;
}

/** The hard limits on the curve (tests check DIFFICULTY against these). */
export const DIFFICULTY_LIMITS = {
  fireRateAtLast: 2,
  shotSpeedAtLast: 1.3,
  rangeAtLast: 1.2,
} as const;

export interface Foes<E extends EnemyTuning, S extends SoldierTuning> {
  enemies: E;
  soldiers: S;
}

/** The enemy numbers for `mission` (1 to the last mission). */
export function difficulty<E extends EnemyTuning, S extends SoldierTuning>(
  mission: number,
  base: Foes<E, S>,
  curve: DifficultyCurve,
): Foes<E, S> {
  if (!Number.isInteger(mission) || mission < 1 || mission > curve.lastMission) {
    throw new RangeError(`mission must be a whole number from 1 to ${curve.lastMission}`);
  }
  // 0 at mission 1, 1 at the last mission.
  const p = curve.lastMission > 1 ? (mission - 1) / (curve.lastMission - 1) : 0;
  // Same percentage step every mission: rate × fireRateAtLast^p.
  const rate = curve.fireRateAtLast ** p;
  const speed = 1 + (curve.shotSpeedAtLast - 1) * p;
  const range = 1 + (curve.rangeAtLast - 1) * p;
  const e = base.enemies;
  const s = base.soldiers;
  return {
    enemies: {
      ...e,
      aaReloadMin: e.aaReloadMin / rate,
      aaReloadMax: e.aaReloadMax / rate,
      flakSpeed: e.flakSpeed * speed,
      aaRange: e.aaRange * range,
    },
    soldiers: {
      ...s,
      reloadMin: s.reloadMin / rate,
      reloadMax: s.reloadMax / rate,
      shotSpeed: s.shotSpeed * speed,
      range: s.range * range,
    },
  };
}
