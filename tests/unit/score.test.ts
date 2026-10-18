import { describe, expect, it } from 'vitest';
import { rescueScore } from '../../src/logic/score';

describe('rescueScore', () => {
  it('gives points per person saved', () => {
    expect(rescueScore(0, { perPerson: 100 })).toBe(0);
    expect(rescueScore(3, { perPerson: 100 })).toBe(300);
  });

  it('rejects impossible counts', () => {
    expect(() => rescueScore(-1, { perPerson: 100 })).toThrow(RangeError);
    expect(() => rescueScore(1.5, { perPerson: 100 })).toThrow(RangeError);
  });
});
