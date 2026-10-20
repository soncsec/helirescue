/**
 * Moving through the missions (roadmap M5.1). Plain TypeScript, unit tested.
 *
 * The score carries from one mission to the next. Retry after a game over,
 * or after a mission failed for too few people saved, restarts the same
 * mission with the score the player entered it with (scope, owner 2026-10-18;
 * the 70% rule, 2026-10-20).
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

/** How a mission ended: enough people saved, too few (70% rule), or no helicopters left. */
export type MissionEndKind = 'complete' | 'failed' | 'gameover';

/** Where the result screen's button goes. */
export function afterResult(
  kind: MissionEndKind,
  start: MissionStart,
  total: number,
  count: number,
): MissionStart {
  if (kind !== 'complete') return { ...start };
  const next = nextMission(start.mission, count);
  // After the last mission (the victory screen shows first): a new game from the first.
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

/**
 * The missions a new game can start from (M5.5): 1 up to the furthest
 * reached, no further than the last mission.
 */
export function startChoices(furthest: number, count: number): number[] {
  const top = Math.max(1, Math.min(Math.floor(furthest) || 1, count));
  return Array.from({ length: top }, (_, i) => i + 1);
}

/** The start mission one step left (-1) or right (1), staying within the choices. */
export function stepChoice(current: number, dir: -1 | 1, choices: readonly number[]): number {
  const i = choices.indexOf(current);
  const next = choices[Math.max(0, Math.min(choices.length - 1, (i < 0 ? 0 : i) + dir))];
  return next ?? 1;
}

/** True when a win ends the whole game (the last mission): the victory screen comes next. */
export function isVictory(kind: MissionEndKind, mission: number, count: number): boolean {
  return kind === 'complete' && nextMission(mission, count) === null;
}
