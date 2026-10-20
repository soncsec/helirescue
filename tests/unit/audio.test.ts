import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUNDS, soundFiles, type SoundKey } from '../../src/config/audio';

const pub = `${process.cwd()}/public/`;
const keys = Object.keys(SOUNDS) as SoundKey[];

describe('sound manifest', () => {
  it('has an Ogg and an M4A file for every sound', () => {
    for (const key of keys) {
      const [ogg, m4a] = soundFiles(key);
      expect(ogg).toBe(`assets/audio/${key}.ogg`);
      expect(m4a).toBe(`assets/audio/${key}.m4a`);
      expect(new TextDecoder().decode(readFileSync(pub + (ogg ?? '')).slice(0, 4))).toBe('OggS');
      expect(new TextDecoder().decode(readFileSync(pub + (m4a ?? '')).slice(4, 8))).toBe('ftyp');
    }
  });

  it('ships no sound files that are not in the manifest', () => {
    const files = readdirSync(`${pub}assets/audio`, { recursive: true });
    expect(files.sort()).toEqual(keys.flatMap((k) => [`${k}.m4a`, `${k}.ogg`]).sort());
  });

  it('stays within the 3 MB audio budget (scope)', () => {
    const total = keys
      .flatMap((k) => soundFiles(k))
      .reduce((sum, f) => sum + readFileSync(pub + f).byteLength, 0);
    expect(total).toBeLessThan(3_000_000);
  });

  it('keeps volumes between 0 and 1, and loops only the music and the rotor', () => {
    for (const key of keys) {
      const s = SOUNDS[key] as { volume: number; loop?: boolean };
      expect(s.volume).toBeGreaterThan(0);
      expect(s.volume).toBeLessThanOrEqual(1);
      expect(s.loop === true).toBe(key === 'music' || key === 'sfx-rotor');
    }
  });

  it('credits every sound file in CREDITS.md', () => {
    const credits = new TextDecoder().decode(readFileSync(`${process.cwd()}/CREDITS.md`));
    for (const f of keys.flatMap((k) => soundFiles(k))) expect(credits).toContain(`\`${f}\``);
  });
});
