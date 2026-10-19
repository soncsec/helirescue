/**
 * Helicopters per mission (scope, owner 2026-10-18): each mission starts with
 * 3; a crash uses one; with none left it is game over, and Retry restarts the
 * current mission. Plain TypeScript, unit tested.
 */

/** What happens after a crash with `left` helicopters (including the one that crashed). */
export function afterCrash(left: number): { left: number; gameOver: boolean } {
  if (!Number.isInteger(left) || left < 1) throw new RangeError('left must be a whole number >= 1');
  return { left: left - 1, gameOver: left - 1 === 0 };
}
