import { describe, expect, it } from 'vitest';
import { SCORING } from '../../src/config/tuning';
import {
  gameOverResult,
  missionBonus,
  missionEnd,
  missionOver,
  peopleNeeded,
  missionResult,
  rescueScore,
} from '../../src/logic/score';

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

describe('gameOverResult', () => {
  it('scores the people saved so far, with no bonus', () => {
    expect(gameOverResult(5, 2, 16, t)).toEqual({
      saved: 5,
      lost: 2,
      total: 16,
      rescue: 500,
      bonus: 0,
      perfect: 0,
      score: 500,
    });
  });

  it('rejects impossible counts', () => {
    expect(() => gameOverResult(10, 7, 16, t)).toThrow(RangeError);
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

describe('the 70% rule (owner, 2026-10-20)', () => {
  it('peopleNeeded is the share of everyone, rounded up', () => {
    expect(peopleNeeded(16, 0.7)).toBe(12); // 11.2
    expect(peopleNeeded(10, 0.7)).toBe(7); // exactly 7, despite floating point
    expect(peopleNeeded(20, 0.7)).toBe(14);
    expect(peopleNeeded(25, 0.7)).toBe(18); // 17.5
    expect(peopleNeeded(0, 0.7)).toBe(0);
    expect(() => peopleNeeded(10, 1.5)).toThrow(RangeError);
    expect(() => peopleNeeded(-1, 0.7)).toThrow(RangeError);
  });

  it('complete only once everyone is saved or lost with enough saved', () => {
    expect(missionEnd({ total: 16, saved: 12, lost: 4 }, 0.7)).toBe('complete');
    expect(missionEnd({ total: 16, saved: 16, lost: 0 }, 0.7)).toBe('complete');
    // Enough saved, but people still waiting: keep flying for more points.
    expect(missionEnd({ total: 16, saved: 12, lost: 0 }, 0.7)).toBeNull();
  });

  it('fails as soon as too many are lost for the rest to make up the number', () => {
    // 16 people, 12 needed: losing 4 still leaves exactly enough; losing 5 does not.
    expect(missionEnd({ total: 16, saved: 0, lost: 4 }, 0.7)).toBeNull();
    expect(missionEnd({ total: 16, saved: 0, lost: 5 }, 0.7)).toBe('failed');
    expect(missionEnd({ total: 16, saved: 11, lost: 5 }, 0.7)).toBe('failed');
  });

  it('every mission needs 70% of its people', () => {
    expect(SCORING.neededShare).toBe(0.7);
  });
});

describe('SCORING tuning', () => {
  it('makes the perfect bonus worth having but smaller than the mission bonus', () => {
    expect(SCORING.perfectBonus).toBeGreaterThan(0);
    expect(SCORING.perfectBonus).toBeLessThan(SCORING.missionBonus);
  });
});
