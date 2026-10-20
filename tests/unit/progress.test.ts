import { describe, expect, it } from 'vitest';
import { afterResult, missionFromQuery, nextMission } from '../../src/logic/progress';

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
