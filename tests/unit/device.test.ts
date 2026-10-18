import { describe, expect, it } from 'vitest';
import { isPortrait, isTouchOnly, wantsTouch } from '../../src/logic/device';

const device = (truthy: string[]) => (q: string) => truthy.includes(q);
const phone = device(['(hover: none)', '(pointer: coarse)']);
const laptopWithTouchScreen = device(['(hover: hover)', '(pointer: fine)']);
const desktop = device(['(hover: hover)', '(pointer: fine)']);

describe('isTouchOnly', () => {
  it('is true for a phone or tablet', () => {
    expect(isTouchOnly(phone)).toBe(true);
  });

  it('is false with a mouse or trackpad, even on a touch screen', () => {
    expect(isTouchOnly(desktop)).toBe(false);
    expect(isTouchOnly(laptopWithTouchScreen)).toBe(false);
    expect(isTouchOnly(device(['(pointer: coarse)']))).toBe(false);
  });
});

describe('wantsTouch', () => {
  it('follows the device by default', () => {
    expect(wantsTouch('', phone)).toBe(true);
    expect(wantsTouch('?seed=4', desktop)).toBe(false);
  });

  it('can be forced on or off from the URL', () => {
    expect(wantsTouch('?touch=1', desktop)).toBe(true);
    expect(wantsTouch('?touch=0', phone)).toBe(false);
    expect(wantsTouch('?touch=maybe', phone)).toBe(true);
  });
});

describe('isPortrait', () => {
  it('reads the orientation media query', () => {
    expect(isPortrait(device(['(orientation: portrait)']))).toBe(true);
    expect(isPortrait(device(['(orientation: landscape)']))).toBe(false);
  });
});
