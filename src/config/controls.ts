/**
 * The controls, listed on the title screen and the pause screen (owner's
 * play-test, 2026-10-20: bombs were easy to miss), so both always agree.
 */

/** A key or button, and what it does. */
export type ControlRow = readonly [key: string, action: string];

export const KEY_CONTROLS: readonly ControlRow[] = [
  ['ARROWS / WASD', 'FLY'],
  ['Z / SPACE', 'SHOOT (HOLD)'],
  ['X', 'DROP A BOMB'],
  ['C', 'TURN AROUND'],
  ['P / ESC', 'PAUSE'],
];

export const TOUCH_CONTROLS: readonly ControlRow[] = [
  ['D-PAD', 'FLY'],
  ['FIRE', 'SHOOT (HOLD)'],
  ['BOMB', 'DROP A BOMB'],
  ['TURN', 'TURN AROUND'],
  ['II', 'PAUSE'],
];

/** A reminder under the mission 1 banner: the bomb, and where the controls are. */
export const START_HINT = {
  keys: 'X: DROP A BOMB   P: CONTROLS',
  touch: 'BOMB: DROP A BOMB   II: CONTROLS',
} as const;
