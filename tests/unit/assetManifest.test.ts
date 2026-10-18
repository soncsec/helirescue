import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IMAGES, SHEETS } from '../../src/config/assets';

/** Width and height from a PNG's header. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(`${process.cwd()}/public/${file}`);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe('art manifest', () => {
  it.each(SHEETS)('$key matches its sprite sheet', (s) => {
    expect(pngSize(s.file)).toEqual({ width: s.frameWidth * s.frames, height: s.frameHeight });
  });

  it.each(IMAGES)('$key matches its image', (img) => {
    expect(pngSize(img.file)).toEqual({ width: img.width, height: img.height });
  });

  it('uses each key once', () => {
    const keys = [...SHEETS, ...IMAGES].map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
