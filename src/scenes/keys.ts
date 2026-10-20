/**
 * Key presses that count once (found in M5.5 testing). Phaser can hand a
 * scene the same keydown event twice: under load its shared key queue is
 * sometimes read on two frames before it is cleared. For keys that toggle or
 * step something (mute, pause, the mission picker) that turns one press into
 * two, so a press of M could switch sound off and straight back on. Each
 * browser event is handled at most once here, whichever key name it came in on.
 */

/** The part of Phaser's keyboard plugin this needs. */
export interface KeyEvents {
  on(event: string, fn: (e: KeyboardEvent) => void): unknown;
}

/** Calls `fn` once per key press of any of `keys` (Phaser key names, e.g. 'M', 'LEFT'). */
export function onPress(
  kb: KeyEvents | null | undefined,
  keys: readonly string[],
  fn: () => void,
): void {
  if (!kb) return;
  let last: KeyboardEvent | null = null;
  const handler = (e: KeyboardEvent): void => {
    if (e === last) return;
    last = e;
    fn();
  };
  for (const key of keys) kb.on(`keydown-${key}`, handler);
}
