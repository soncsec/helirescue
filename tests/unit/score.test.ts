import { describe, expect, it } from 'vitest';
import { SCORING } from '../../src/config/tuning';
import { missionBonus, missionOver, missionResult, rescueScore } from '../../src/logic/score';

const t = { perPerson: 100, missionBonus: 1000, perfectBonus: 500 };

describe('rescueScore', () => {
  it('gives points per person saved', () => {
    expect(rescueScore(0, t)).toBe(0);
    expect(rescueScore(3, t)).toBe(300);
  });

  it('rejects impossible counts', () => {
    expect(() => rescueScore(-1, t)).toThrow(RangeError);
    expect(() => rescueScore(1.5, t)).toThrow(RangeError);
  });
});

describe('missionBonus', () => {
  it('scales the bonus by the share saved, perfect only when all are saved', () => {
    expect(missionBonus(16, 16, t)).toEqual({ bonus: 1000, perfect: 500 });
    expect(missionBonus(8, 16, t)).toEqual({ bonus: 500, perfect: 0 });
    expect(missionBonus(0, 16, t)).toEqual({ bonus: 0, perfect: 0 });
    expect(missionBonus(1, 3, t)).toEqual({ bonus: 333, perfect: 0 }); // rounded
  });

  it('never rewards losing people: more saved is never fewer points', () => {
    for (let saved = 1; saved <= 16; saved++) {
      const less = missionResult(saved - 1, 16 - saved + 1, 16, t).score;
      expect(missionResult(saved, 16 - saved, 16, t).score).toBeGreaterThan(less);
    }
  });

  it('is zero for an empty mission and rejects impossible counts', () => {
    expect(missionBonus(0, 0, t)).toEqual({ bonus: 0, perfect: 0 });
    expect(() => missionBonus(5, 4, t)).toThrow(RangeError);
    expect(() => missionBonus(-1, 4, t)).toThrow(RangeError);
  });
});

describe('missionResult', () => {
  it('adds the rescue points, bonus and perfect bonus', () => {
    expect(missionResult(16, 0, 16, t)).toEqual({
      saved: 16,
      lost: 0,
      total: 16,
      rescue: 1600,
      bonus: 1000,
      perfect: 500,
      score: 3100,
    });
    expect(missionResult(12, 4, 16, t).score).toBe(1200 + 750);
  });

  it('rejects more saved and lost than there are people', () => {
    expect(() => missionResult(10, 7, 16, t)).toThrow(RangeError);
    expect(() => missionResult(1, -1, 16, t)).toThrow(RangeError);
  });
});

describe('missionOver', () => {
  it('ends when everyone is saved or lost, not before', () => {
    expect(missionOver({ total: 16, saved: 16, lost: 0 })).toBe(true);
    expect(missionOver({ total: 16, saved: 10, lost: 6 })).toBe(true);
    expect(missionOver({ total: 16, saved: 15, lost: 0 })).toBe(false);
    expect(missionOver({ total: 0, saved: 0, lost: 0 })).toBe(false);
  });
});

describe('SCORING tuning', () => {
  it('makes the perfect bonus worth having but smaller than the mission bonus', () => {
    expect(SCORING.perfectBonus).toBeGreaterThan(0);
    expect(SCORING.perfectBonus).toBeLessThan(SCORING.missionBonus);
  });
});
