/**
 * Moving through the missions (roadmap M5.1). Plain TypeScript, unit tested.
 *
 * The score carries from one mission to the next. Retry after a game over
 * restarts the same mission with the score the player entered it with
 * (scope, owner 2026-10-18).
 */

/** What a mission starts with. */
export interface MissionStart {
  /** Missions are numbered from 1. */
  mission: number;
  /** Score brought in from earlier missions. */
  startScore: number;
}

/** The mission after `mission`, or null after the last one. */
export function nextMission(mission: number, count: number): number | null {
  return mission < count ? mission + 1 : null;
}

/** Where the result screen's button goes. */
export function afterResult(
  kind: 'complete' | 'gameover',
  start: MissionStart,
  total: number,
  count: number,
): MissionStart {
  if (kind === 'gameover') return { ...start };
  const next = nextMission(start.mission, count);
  // After the last mission: back to the first (the victory screen comes in M5.5).
  return next === null ? { mission: 1, startScore: 0 } : { mission: next, startScore: total };
}

/**
 * The mission picked with ?mission=N in the URL (for play-testing a mission
 * without flying the ones before it), or null. Only a plain whole number from
 * 1 to `count` counts; anything else is ignored.
 */
export function missionFromQuery(search: string, count: number): number | null {
  const raw = new URLSearchParams(search).get('mission');
  if (raw === null || !/^[1-9]\d{0,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= count ? n : null;
}
