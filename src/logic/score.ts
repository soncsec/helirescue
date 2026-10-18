/** Scoring rules: points per person saved; no penalties (scope). Mission bonus comes in M3. */

export interface ScoringTuning {
  perPerson: number;
}

/** The score for a number of people saved. */
export function rescueScore(saved: number, t: ScoringTuning): number {
  if (!Number.isInteger(saved) || saved < 0)
    throw new RangeError('saved must be a whole number >= 0');
  return saved * t.perPerson;
}
