/**
 * Scoring rules (scope): points per person saved, a mission bonus scaled by
 * the share of people saved, and a perfect-rescue bonus; no penalties.
 * Plain TypeScript, unit tested.
 */

export interface ScoringTuning {
  perPerson: number;
  /** Mission bonus when everyone is saved; scaled down by the share saved. */
  missionBonus: number;
  /** Extra when nobody is lost. */
  perfectBonus: number;
}

/** What the result screen shows at the end of a mission. */
export interface MissionResult {
  saved: number;
  lost: number;
  total: number;
  /** Points for the people saved. */
  rescue: number;
  bonus: number;
  perfect: number;
  score: number;
}

function count(n: number, what: string): void {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`${what} must be a whole number >= 0`);
}

/** The score for a number of people saved. */
export function rescueScore(saved: number, t: Pick<ScoringTuning, 'perPerson'>): number {
  count(saved, 'saved');
  return saved * t.perPerson;
}

/** The mission bonus: scaled by the share saved, plus the perfect bonus when all are saved. */
export function missionBonus(
  saved: number,
  total: number,
  t: ScoringTuning,
): { bonus: number; perfect: number } {
  count(saved, 'saved');
  count(total, 'total');
  if (saved > total) throw new RangeError('saved cannot exceed total');
  if (total === 0) return { bonus: 0, perfect: 0 };
  return {
    bonus: Math.round((t.missionBonus * saved) / total),
    perfect: saved === total ? t.perfectBonus : 0,
  };
}

/** The full result of a mission. */
export function missionResult(
  saved: number,
  lost: number,
  total: number,
  t: ScoringTuning,
): MissionResult {
  count(lost, 'lost');
  if (saved + lost > total) throw new RangeError('saved + lost cannot exceed total');
  const rescue = rescueScore(saved, t);
  const { bonus, perfect } = missionBonus(saved, total, t);
  return { saved, lost, total, rescue, bonus, perfect, score: rescue + bonus + perfect };
}

/** Game over: the points for the people saved so far, with no mission bonus. */
export function gameOverResult(
  saved: number,
  lost: number,
  total: number,
  t: ScoringTuning,
): MissionResult {
  count(lost, 'lost');
  if (saved + lost > total) throw new RangeError('saved + lost cannot exceed total');
  const rescue = rescueScore(saved, t);
  return { saved, lost, total, rescue, bonus: 0, perfect: 0, score: rescue };
}

/** A mission ends when every person is saved or lost (scope). */
export function missionOver(t: { total: number; saved: number; lost: number }): boolean {
  return t.total > 0 && t.saved + t.lost >= t.total;
}
