/**
 * Saved data (H9): one localStorage key holding the high score, the mute
 * setting and the furthest mission reached. No personal data. Anything
 * unexpected in storage (edited, corrupt, from an older version) falls back to
 * the default for that field, so a bad value can never break the game.
 * Plain TypeScript, unit tested; the scene side only reads and writes the string.
 */

export const SAVE_KEY = 'helirescue';

export interface SaveData {
  highScore: number;
  muted: boolean;
  /** Missions are numbered from 1. */
  furthestMission: number;
}

export interface SaveLimits {
  /** Highest believable score; anything above is treated as corrupt. */
  maxScore: number;
  missions: number;
}

export const DEFAULT_SAVE: SaveData = { highScore: 0, muted: false, furthestMission: 1 };

const wholeIn = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** Reads the stored string; each field is checked on its own. */
export function parseSave(raw: string | null, limits: SaveLimits): SaveData {
  if (raw === null) return { ...DEFAULT_SAVE };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SAVE };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ...DEFAULT_SAVE };
  const d = data as Record<string, unknown>;
  return {
    highScore: wholeIn(d['highScore'], 0, limits.maxScore)
      ? d['highScore']
      : DEFAULT_SAVE.highScore,
    muted: typeof d['muted'] === 'boolean' ? d['muted'] : DEFAULT_SAVE.muted,
    furthestMission: wholeIn(d['furthestMission'], 1, limits.missions)
      ? d['furthestMission']
      : DEFAULT_SAVE.furthestMission,
  };
}

/** The string to store: exactly the three known fields. */
export function serializeSave(d: SaveData): string {
  return JSON.stringify({
    highScore: d.highScore,
    muted: d.muted,
    furthestMission: d.furthestMission,
  });
}

/** Records a finished mission's score; `isNew` when it beats the high score. */
export function recordScore(
  d: SaveData,
  score: number,
  limits: SaveLimits,
): { data: SaveData; isNew: boolean } {
  if (!wholeIn(score, 0, limits.maxScore)) return { data: d, isNew: false };
  return score > d.highScore
    ? { data: { ...d, highScore: score }, isNew: true }
    : { data: d, isNew: false };
}
