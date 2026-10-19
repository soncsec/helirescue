import { describe, expect, it } from 'vitest';
import { SAVE } from '../../src/config/tuning';
import {
  DEFAULT_SAVE,
  parseSave,
  recordScore,
  SAVE_KEY,
  serializeSave,
} from '../../src/logic/save';

const limits = { maxScore: 9_999_999, missions: 5 };

describe('parseSave', () => {
  it('gives the defaults when nothing is stored', () => {
    expect(parseSave(null, limits)).toEqual(DEFAULT_SAVE);
  });

  it('reads a valid save', () => {
    expect(parseSave('{"highScore":3100,"muted":true,"furthestMission":3}', limits)).toEqual({
      highScore: 3100,
      muted: true,
      furthestMission: 3,
    });
  });

  it('falls back to the defaults for broken or foreign data', () => {
    for (const raw of ['', 'not json', '[]', 'null', '42', '"text"', '{']) {
      expect(parseSave(raw, limits)).toEqual(DEFAULT_SAVE);
    }
  });

  it('checks each field on its own', () => {
    expect(parseSave('{"highScore":-5,"muted":"yes","furthestMission":3}', limits)).toEqual({
      highScore: 0,
      muted: false,
      furthestMission: 3,
    });
    expect(parseSave('{"highScore":1.5,"furthestMission":9}', limits)).toEqual(DEFAULT_SAVE);
    expect(parseSave('{"highScore":10000000}', limits).highScore).toBe(0); // above the limit
    expect(parseSave('{"highScore":"3100"}', limits).highScore).toBe(0); // a string, not a number
  });

  it('ignores extra fields and never passes them on', () => {
    const d = parseSave('{"highScore":10,"__proto__":{"x":1},"name":"<b>"}', limits);
    expect(d).toEqual({ highScore: 10, muted: false, furthestMission: 1 });
    expect(Object.keys(JSON.parse(serializeSave(d)))).toEqual([
      'highScore',
      'muted',
      'furthestMission',
    ]);
  });
});

describe('serializeSave', () => {
  it('round-trips through parseSave', () => {
    const d = { highScore: 4200, muted: true, furthestMission: 2 };
    expect(parseSave(serializeSave(d), limits)).toEqual(d);
  });
});

describe('recordScore', () => {
  it('keeps the higher score and says when it is new', () => {
    const d = { ...DEFAULT_SAVE, highScore: 1000 };
    expect(recordScore(d, 1500, limits)).toEqual({ data: { ...d, highScore: 1500 }, isNew: true });
    expect(recordScore(d, 900, limits)).toEqual({ data: d, isNew: false });
    expect(recordScore(d, 1000, limits)).toEqual({ data: d, isNew: false });
  });

  it('ignores an impossible score', () => {
    const d = { ...DEFAULT_SAVE };
    expect(recordScore(d, -1, limits).isNew).toBe(false);
    expect(recordScore(d, 2.5, limits).isNew).toBe(false);
  });
});

describe('save settings', () => {
  it('uses one key named after the game (H9) and covers all 5 missions', () => {
    expect(SAVE_KEY).toBe('helirescue');
    expect(SAVE.missions).toBe(5);
    expect(SAVE.maxScore).toBeGreaterThan(5 * 3100);
  });
});
