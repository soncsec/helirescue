import { describe, expect, it } from 'vitest';
import { LANDING, LIVES } from '../../src/config/tuning';
import { afterCrash } from '../../src/logic/lives';

describe('afterCrash', () => {
  it('uses up one helicopter; the last one is game over', () => {
    expect(afterCrash(3)).toEqual({ left: 2, gameOver: false });
    expect(afterCrash(2)).toEqual({ left: 1, gameOver: false });
    expect(afterCrash(1)).toEqual({ left: 0, gameOver: true });
  });

  it('rejects a crash with no helicopter left', () => {
    expect(() => afterCrash(0)).toThrow(RangeError);
    expect(() => afterCrash(1.5)).toThrow(RangeError);
  });
});

describe('LIVES tuning', () => {
  it('gives 3 helicopters per mission (scope)', () => {
    expect(LIVES.perMission).toBe(3);
    // The wreck shows longer than a respawn takes, so it is plain that none comes.
    expect(LIVES.gameOverSeconds).toBeGreaterThan(LANDING.respawnSeconds);
  });
});
