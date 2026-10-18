import { describe, expect, it } from 'vitest';
import { isTouchOnly } from '../../src/logic/device';

const device =
  (...queries: string[]) =>
  (q: string) =>
    queries.includes(q);

describe('isTouchOnly', () => {
  it('is true for a phone or tablet', () => {
    expect(isTouchOnly(device('(hover: none)', '(pointer: coarse)'))).toBe(true);
  });

  it('is false for a desktop, or a laptop with a touch screen', () => {
    expect(isTouchOnly(device())).toBe(false);
    expect(isTouchOnly(device('(pointer: coarse)'))).toBe(false);
    expect(isTouchOnly(device('(hover: none)'))).toBe(false);
  });
});
