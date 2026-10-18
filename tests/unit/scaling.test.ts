import { describe, expect, it } from 'vitest';
import { fitZoom, integerZoom, zoomFor } from '../../src/logic/scaling';

describe('integerZoom', () => {
  it('picks the largest whole zoom that fits', () => {
    expect(integerZoom(1920, 1080, 256, 320)).toBe(3); // height limits: 1080 / 320 = 3.375
    expect(integerZoom(2560, 1440, 256, 320)).toBe(4); // 1440 / 320 = 4.5
    expect(integerZoom(800, 600, 256, 320)).toBe(1); // 600 / 320 = 1.875
  });

  it('uses the tighter of width and height', () => {
    expect(integerZoom(600, 2000, 256, 320)).toBe(2); // width limits: 600 / 256 = 2.34
  });

  it('returns exact multiples unchanged', () => {
    expect(integerZoom(512, 640, 256, 320)).toBe(2);
  });

  it('never goes below 1 for tiny or empty windows', () => {
    expect(integerZoom(100, 100, 256, 320)).toBe(1);
    expect(integerZoom(0, 0, 256, 320)).toBe(1);
    expect(integerZoom(Number.NaN, 600, 256, 320)).toBe(1);
  });

  it('rejects a non-positive game size', () => {
    expect(() => integerZoom(800, 600, 0, 320)).toThrow(RangeError);
    expect(() => integerZoom(800, 600, 256, -1)).toThrow(RangeError);
  });
});

describe('fitZoom', () => {
  it('fills the window in the tighter direction, fractions allowed', () => {
    expect(fitZoom(844, 390, 480, 270)).toBeCloseTo(390 / 270); // a phone: about 1.44
    expect(fitZoom(1920, 1080, 480, 270)).toBe(4);
    expect(fitZoom(1024, 768, 480, 270)).toBeCloseTo(1024 / 480); // width limits
  });

  it('never goes below one half, and is 1 for a broken window size', () => {
    expect(fitZoom(100, 100, 480, 270)).toBe(0.5);
    expect(fitZoom(Number.NaN, 390, 480, 270)).toBe(1);
  });

  it('rejects a non-positive game size', () => {
    expect(() => fitZoom(800, 600, 480, 0)).toThrow(RangeError);
  });
});

describe('zoomFor', () => {
  it('fits on touch devices and keeps whole numbers elsewhere (H8)', () => {
    expect(zoomFor(true, 844, 390, 480, 270)).toBeCloseTo(390 / 270);
    expect(zoomFor(false, 844, 390, 480, 270)).toBe(1);
    expect(zoomFor(false, 1920, 1080, 480, 270)).toBe(4);
  });
});
