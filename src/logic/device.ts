/**
 * True on devices whose only pointer is a finger (phones, most tablets):
 * no hover and a coarse pointer. A laptop with a touch screen still has a
 * mouse or trackpad, so it counts as a keyboard device.
 */
export function isTouchOnly(matches: (mediaQuery: string) => boolean): boolean {
  return matches('(hover: none)') && matches('(pointer: coarse)');
}
