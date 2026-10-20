import { describe, expect, it } from 'vitest';
import {
  afterResult,
  isVictory,
  missionFromQuery,
  nextMission,
  startChoices,
  stepChoice,
} from '../../src/logic/progress';

describe('nextMission', () => {
  it('moves on until the last mission', () => {
    expect(nextMission(1, 5)).toBe(2);
    expect(nextMission(4, 5)).toBe(5);
    expect(nextMission(5, 5)).toBeNull();
  });
});

describe('afterResult', () => {
  it('a win starts the next mission with the running score', () => {
    expect(afterResult('complete', { mission: 1, startScore: 0 }, 2700, 5)).toEqual({
      mission: 2,
      startScore: 2700,
    });
  });

  it('Retry restarts the same mission with the score it was entered with', () => {
    expect(afterResult('gameover', { mission: 3, startScore: 4100 }, 4600, 5)).toEqual({
      mission: 3,
      startScore: 4100,
    });
  });

  it('Retry after a failed mission (too few saved) also restarts it with the entry score', () => {
    expect(afterResult('failed', { mission: 2, startScore: 2700 }, 3500, 5)).toEqual({
      mission: 2,
      startScore: 2700,
    });
  });

  it('after the last mission, starts again from mission 1 with no score', () => {
    expect(afterResult('complete', { mission: 2, startScore: 2700 }, 5000, 2)).toEqual({
      mission: 1,
      startScore: 0,
    });
  });
});

describe('missionFromQuery', () => {
  it('reads ?mission=N for an existing mission', () => {
    expect(missionFromQuery('?mission=2', 2)).toBe(2);
    expect(missionFromQuery('?seed=4&mission=1', 2)).toBe(1);
  });

  it('ignores anything else', () => {
    for (const q of [
      '',
      '?mission=',
      '?mission=0',
      '?mission=3',
      '?mission=-1',
      '?mission=1.5',
      '?mission=2abc',
      '?mission=%3Cscript%3E',
      '?mission=02',
      '?mission=99999',
    ]) {
      expect(missionFromQuery(q, 2)).toBeNull();
    }
  });
});

describe('startChoices (M5.5)', () => {
  it('offers mission 1 up to the furthest reached', () => {
    expect(startChoices(1, 5)).toEqual([1]);
    expect(startChoices(3, 5)).toEqual([1, 2, 3]);
    expect(startChoices(5, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('never offers a mission that does not exist', () => {
    expect(startChoices(9, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(startChoices(0, 5)).toEqual([1]);
    expect(startChoices(Number.NaN, 5)).toEqual([1]);
  });
});

describe('stepChoice', () => {
  const choices = [1, 2, 3];
  it('moves one step and stops at either end', () => {
    expect(stepChoice(2, 1, choices)).toBe(3);
    expect(stepChoice(3, 1, choices)).toBe(3);
    expect(stepChoice(2, -1, choices)).toBe(1);
    expect(stepChoice(1, -1, choices)).toBe(1);
  });

  it('starts from the first choice if the current one is not offered', () => {
    expect(stepChoice(9, 1, choices)).toBe(2);
    expect(stepChoice(9, -1, [1])).toBe(1);
  });
});

describe('isVictory', () => {
  it('only a win on the last mission ends the game', () => {
    expect(isVictory('complete', 5, 5)).toBe(true);
    expect(isVictory('complete', 4, 5)).toBe(false);
    expect(isVictory('gameover', 5, 5)).toBe(false);
    expect(isVictory('failed', 5, 5)).toBe(false);
  });
});
