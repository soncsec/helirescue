/**
 * True on devices whose only pointer is a finger (phones, most tablets):
 * no hover and a coarse pointer. A laptop with a touch screen still has a
 * mouse or trackpad, so it counts as a keyboard device.
 */
export function isTouchOnly(matches: (mediaQuery: string) => boolean): boolean {
  return matches('(hover: none)') && matches('(pointer: coarse)');
}

/** True while the screen is taller than it is wide. */
export function isPortrait(matches: (mediaQuery: string) => boolean): boolean {
  return matches('(orientation: portrait)');
}

/**
 * Whether to show the touch controls and use fit-to-screen scaling (H8):
 * `?touch=1` forces them on (to try them with a mouse), `?touch=0` off;
 * otherwise touch-only devices get them.
 */
export function wantsTouch(search: string, matches: (mediaQuery: string) => boolean): boolean {
  const forced = new URLSearchParams(search).get('touch');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return isTouchOnly(matches);
}
